const express = require("express");
const app = express();
const path = require("path");
const PORT = 3000;
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const sessions = require('express-session');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "./public")));
app.set('view engine', 'ejs');
app.use(cookieParser());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "ttc_arien",
    password: "",
    port: "3306",
});

app.use(sessions({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hour
}));

app.get('/', (req, res) => {
    let setsql = `SELECT * FROM ttc_sets ORDER BY set_date DESC`;
    let namesql = `SELECT user_id, username FROM ttc_users`; // Fetch usernames
    let name = req.session.username || "guest"; // Default to 'guest' if username is not set
    let authen = req.session.authen || null;
    db.query(setsql, (errSets, resultSets) => {
        if (errSets) throw errSets;
        db.query(namesql, (errUsers, resultUsers) => {
            if (errUsers) throw errUsers;
            res.render('index', { sets: resultSets, users: resultUsers, name: name, authen: authen });
        });
    });
});


app.get('/set', (req, res) => {
    const sid = req.query.id;
    const limit = 10;
    const page = req.query.page || 1;
    const offset = (page - 1) * limit;
    const countQuery = `SELECT COUNT(*) AS total FROM ttc_cards WHERE set_id = ${sid}`;
    const sql = `
        SELECT *
        FROM ttc_cards 
        JOIN ttc_sets ON ttc_cards.set_id = ttc_sets.set_id 
        JOIN ttc_stages ON ttc_cards.stage = ttc_stages.st_id
        JOIN ttc_user_cards ON ttc_cards.id = ttc_user_cards.card_id
        JOIN ttc_users ON ttc_user_cards.user_id = ttc_users.user_id
        WHERE ttc_sets.set_id = ${sid}
        LIMIT ${limit}
        OFFSET ${offset};
    `;
    db.query(countQuery, (errCount, countResult) => {
        if (errCount) throw errCount;

        const totalCards = countResult[0].total;
        const totalPages = Math.ceil(totalCards / limit);

        db.query(sql, (err, result) => {
            if (err) throw err;
            res.render('details', { cards: result, source: 'card', totalPages: totalPages, currentPage: page });
        });
    });
});

app.get('/add', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const user = `SELECT * FROM ttc_users WHERE user_id = "${uid}" `;
        db.query(user, (err, row) => {
            if (err) throw err;
            let setsQuery = `SELECT set_id, set_name FROM ttc_sets`;
            db.query(setsQuery, (err, sets) => {
                if (err) throw err;
                let stagesQuery = `SELECT st_id, st_name FROM ttc_stages`;
                db.query(stagesQuery, (err, stages) => {
                    if (err) throw err;
                    res.render('add', { sets: sets, stages: stages });
                });
            });
        });
    } else {
        res.send("denied");
    }
});

app.post('/add', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const cardName = req.body.card_name;
        const setID = req.body.card_set;
        const hp = req.body.card_hp;
        const stageID = req.body.card_stage;
        const attacks = req.body.card_attack;
        const img = req.body.card_image;
        const cardInsertQuery = `INSERT INTO ttc_cards (name, set_id, hp, stage, attacks, image) 
                                VALUES ('${cardName}', '${setID}', '${hp}', '${stageID}', '${attacks}', '${img}')`;
        db.query(cardInsertQuery, (err, addResult) => {
            if (err) throw err;
            const cardID = addResult.insertId;
            const userCardInsertQuery = `INSERT INTO ttc_user_cards (user_id, card_id) VALUES ('${uid}', '${cardID}')`;
            db.query(userCardInsertQuery, (err, result) => {
                if (err) throw err;
                res.send('Card added successfully!');
            });
        });
    } else {
        res.send("denied");
    }
});

app.get('/member', (req, res) => {
    const userId = req.query.id;
    const limit = 10;
    const page = req.query.page || 1;
    const offset = (page - 1) * limit;
    const countQuery = `SELECT COUNT(*) AS total FROM ttc_user_cards WHERE user_id = ${userId}`;
    const userCardsQuery = `
        SELECT *
        FROM ttc_cards
        JOIN ttc_user_cards ON ttc_cards.id = ttc_user_cards.card_id
        JOIN ttc_stages ON ttc_cards.stage = ttc_stages.st_id
        JOIN ttc_users ON ttc_user_cards.user_id = ttc_users.user_id
        JOIN ttc_sets ON ttc_cards.set_id = ttc_sets.set_id
        WHERE ttc_user_cards.user_id = ${userId}
        LIMIT ${limit}
        OFFSET ${offset};
    `;
    db.query(countQuery, (errCount, countResult) => {
        if (errCount) throw errCount;

        const totalCards = countResult[0].total;
        const totalPages = Math.ceil(totalCards / limit);

        db.query(userCardsQuery, (err, userCards) => {
            if (err) throw err;
            res.render('details', {userId: userId, source: 'member', member: userCards, totalPages: totalPages, currentPage: page});
        });
    });
});

app.get('/login', (req, res) => {
    let title = "Login";
    res.render('login', { tdata: title, source: 'login', error: '' });
});

app.get('/signup', (req, res) => {
    let title = "Sign up";
    res.render('login', { tdata: title, source: 'signup' });
});

app.post('/signup', (req, res) => {
    const username = req.body.signup_username;
    const email = req.body.signup_email;
    const password = req.body.signup_password;
    // Check if the username or email already exists
    let checkExistingUser = `SELECT * FROM ttc_users WHERE username = "${username}" OR email = "${email}"`;
    db.query(checkExistingUser, (err, existingUser) => {
        if (err) throw err;
        if (existingUser.length > 0) {
            // Username or email already exists, render an error message
            let title = "Sign up";
            res.render('login', { tdata: title, source: 'signup', error: 'Username or email already in use' });
        } else {
            // Username and email are unique, proceed with the signup
            let sqlinsert = `INSERT INTO ttc_users (username, email, password) VALUES ("${username}", "${email}", "${password}");`;
            db.query(sqlinsert, (err, result) => {
                if (err) throw err;
                const userId = result.insertId;
                req.session.username = username;
                req.session.authen = userId;
                res.redirect('/');
            });
        }
    });
});

app.post('/login', (req, res) => {
    const useremail = req.body.login_email;
    const password = req.body.login_password;
    const checkuser = `SELECT * FROM ttc_users WHERE email = "${useremail}" AND password = "${password}"`;
    db.query(checkuser, (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            req.session.username = result[0].username;
            req.session.authen = result[0].user_id;
            res.redirect('/');
        } else {
            res.render('login', { tdata: 'Login', source: 'login', error: 'Incorrect email and/or password' });
        }
    });
});


app.listen(PORT, () => {
    console.log(`App running on http://localhost:${PORT}`)
});
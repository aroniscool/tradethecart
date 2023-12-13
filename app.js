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
    let namesql = `SELECT user_id, username FROM ttc_users`;
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
    const limit = 8;
    const page = req.query.page || 1;
    const offset = (page - 1) * limit;
    const countQuery = `SELECT COUNT(*) AS total FROM ttc_cards WHERE set_id = ${sid}`;
    const sql = `
        SELECT *
        FROM ttc_cards 
        JOIN ttc_sets ON ttc_cards.set_id = ttc_sets.set_id 
        JOIN ttc_stages ON ttc_cards.stage = ttc_stages.st_id
        WHERE ttc_sets.set_id = ${sid}
        LIMIT ${limit}
        OFFSET ${offset};`;
    db.query(countQuery, (errCount, countResult) => {
        if (errCount) throw errCount;
        const totalCards = countResult[0].total;
        const totalPages = Math.ceil(totalCards / limit);
        db.query(sql, (err, result) => {
            if (err) throw err;
            res.render('details', { setID: sid, cards: result, source: 'set', totalPages: totalPages });
        });
    });
});

app.get('/card', (req, res) => {
    const cardID = req.query.id;
    const sql = `
    SELECT *
    FROM ttc_cards 
    JOIN ttc_sets ON ttc_cards.set_id = ttc_sets.set_id 
    JOIN ttc_stages ON ttc_cards.stage = ttc_stages.st_id
    WHERE ttc_cards.id = ${cardID}`;
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.render('details', { cardID: cardID, card: result[0], source: 'card' });
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
                    res.render('add', { sets: sets, stages: stages, source: 'addcard' });
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
                res.render('success', { message: 'Card added successfully!' });
            });
        });
    } else {
        res.send("denied");
    }
});

app.get('/addcollection', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const userQuery = `SELECT * FROM ttc_users WHERE user_id = "${uid}" `;
        db.query(userQuery, (err, userRow) => {
            if (err) throw err;
            const cardsQuery = `SELECT * FROM ttc_cards`;
            db.query(cardsQuery, (err2, cardsRow) => {
                if (err2) throw err2;
                res.render('add', { source: 'addcollection', user: userRow, cards: cardsRow, error: '' });
            });
        });
    } else {
        res.send("denied");
    }
});

app.post('/addcollection', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const selectedCard = req.body.cards;
        const userQuery = `SELECT * FROM ttc_users WHERE user_id = "${uid}" `;
        db.query(userQuery, (err, userRow) => {
            if (err) throw err;
            const cardsQuery = `SELECT * FROM ttc_cards`;
            db.query(cardsQuery, (err2, cardsRow) => {
                if (err2) throw err2;
                const checkUserCardQuery = `SELECT * FROM ttc_user_cards WHERE user_id = ${uid} AND card_id = ${selectedCard}`;
                db.query(checkUserCardQuery, (err, userCardResult) => {
                    if (err) throw err;
                    if (userCardResult.length > 0) {
                        res.render('add', { source: 'addcollection', user: userRow, cards: cardsRow, error: 'Card already exists in your collection!' });
                    } else {
                        const addUserCardQuery = `INSERT INTO ttc_user_cards (user_id, card_id) VALUES (${uid}, ${selectedCard})`;
                        db.query(addUserCardQuery, (errAdd, addUserCardResult) => {
                            if (errAdd) throw errAdd;
                            res.render('success', { message: 'Card added to your collection!' });
                        });
                    }
                });
            });
        });
    } else {
        res.send("denied");
    }
});

app.get('/member', (req, res) => {
    let authen = req.session.authen || null;
    const userId = req.query.id;
    const limit = 8;
    const page = req.query.page || 1;
    const offset = (page - 1) * limit;
    const sort = req.query.sort || 'name'; // Default to sorting by card name
    const order = req.query.order || 'ASC'; // Default to ascending order

    const countQuery = `SELECT COUNT(*) AS total FROM ttc_user_cards WHERE user_id = ${userId}`;
    const userCardsQuery = `
        SELECT *
        FROM ttc_cards
        JOIN ttc_user_cards ON ttc_cards.id = ttc_user_cards.card_id
        JOIN ttc_stages ON ttc_cards.stage = ttc_stages.st_id
        JOIN ttc_users ON ttc_user_cards.user_id = ttc_users.user_id
        JOIN ttc_sets ON ttc_cards.set_id = ttc_sets.set_id
        WHERE ttc_user_cards.user_id = ${userId}
        ORDER BY ${sort} ${order}  -- Added ORDER BY clause
        LIMIT ${limit}
        OFFSET ${offset};
    `;

    db.query(countQuery, (errCount, countResult) => {
        if (errCount) throw errCount;

        const totalCards = countResult[0].total;
        const totalPages = Math.ceil(totalCards / limit);

        db.query(userCardsQuery, (err, userCards) => {
            if (err) throw err;
            res.render('details', { userId: userId, source: 'member', member: userCards, totalPages: totalPages, authen: authen });
        });
    });
});

app.get('/delete', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const userQuery = `SELECT * FROM ttc_users WHERE user_id = "${uid}" `;
        db.query(userQuery, (err, userRow) => {
            if (err) throw err;
            const cardsQuery = `
                SELECT ttc_cards.id, ttc_cards.name
                FROM ttc_user_cards
                JOIN ttc_cards ON ttc_user_cards.card_id = ttc_cards.id
                WHERE ttc_user_cards.user_id = "${uid}"
            `;
            db.query(cardsQuery, (err2, cardsRow) => {
                if (err2) throw err2;
                res.render('edit', { source: 'delete', user: userRow, cards: cardsRow });
            });
        });
    } else {
        res.send("denied");
    }
});

app.post('/delete', (req, res) => {
    const sessionobj = req.session;
    if (sessionobj.authen) {
        const uid = sessionobj.authen;
        const cardId = req.body.cardId;
        const deleteCardQuery = `DELETE FROM ttc_user_cards WHERE user_id = "${uid}" AND card_id = "${cardId}"`;
        db.query(deleteCardQuery, (err, result) => {
            if (err) throw err;
            res.render('success', { message: 'Card removed from your collection!' });
        });
    } else {
        res.send("denied");
    }
});

app.get('/login', (req, res) => {
    res.render('login', { title: "Login", source: 'login', error: '' });
});

app.get('/signup', (req, res) => {
    res.render('login', { title: "Sign up", source: 'signup', error: '' });
});

app.post('/signup', (req, res) => {
    const username = req.body.signup_username;
    const email = req.body.signup_email;
    const password = req.body.signup_password;
    let checkExistingUser = `SELECT * FROM ttc_users WHERE username = "${username}" OR email = "${email}"`;
    db.query(checkExistingUser, (err, existingUser) => {
        if (err) throw err;
        if (existingUser.length > 0) {
            let title = "Sign up";
            res.render('login', { title: title, source: 'signup', error: 'Username or email already in use' });
        } else {
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
            res.render('login', { title: 'Login', source: 'login', error: 'Incorrect email and/or password' });
        }
    });
});
/*
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) throw err;
        res.redirect('/');
    });
});
*/
app.listen(PORT, () => {
    console.log(`App running on http://localhost:${PORT}`)
});
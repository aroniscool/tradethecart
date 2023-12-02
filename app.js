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
    let name = req.session.username || "guest"; // Default to 'guest' if username is not set
    let authen = req.session.authen || null;
    db.query(setsql, (err, result) => {
        if (err) throw err;
        res.render('index', { sets: result, name: name, authen: authen });
    });
});

app.get('/set', (req, res) => {
    const sid = req.query.id;
    const sql = `SELECT ttc_sets.set_name, ttc_cards.name, ttc_cards.hp, ttc_cards.attacks, ttc_stages.st_name, ttc_cards.img_low FROM ttc_cards 
                INNER JOIN ttc_sets ON ttc_cards.set_id = ttc_sets.set_id JOIN ttc_stages ON ttc_cards.stage = ttc_stages.st_id
                WHERE ttc_sets.set_id = ${sid};`;
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.render('details', { cards: result, source: 'card' });
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
    const cardName = req.body.card_name;
    const setID = req.body.card_set;
    const hp = req.body.card_hp;
    const stageID = req.body.card_stage;
    const attacks = req.body.card_attack;
    const imgLow = req.body.card_img_low;
    const imgHigh = req.body.card_img_high;
    const CardQuery = `INSERT INTO ttc_cards (name, set_id, hp, stage, attacks, img_low, img_high) 
                        VALUES ('${cardName}','${setID}', '${hp}', '${stageID}', '${attacks}', '${imgLow}', '${imgHigh}')`;
    db.query(CardQuery, (err, result) => {
        if (err) {
            console.error(err);
            res.send('Error adding the card. Please try again.');
        } else {
            res.send('Card added successfully!');
        }
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
                res.send(`Congratulations ${username}! You have successfully signed up!`);
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
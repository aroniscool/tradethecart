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
    host:"localhost",
    user:"root",
    database:"abhuiyan01",
    password:"",
    port:"3306",
});

app.use(sessions({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hour
}));

app.get('/', (req, res) => {
    let setsql = `SELECT * FROM ttc_sets`;
    let role = req.session.role || "guest"; // Default to 'guest' if role is not set
    db.query(setsql, (err, result) => {
        if (err) throw err;
        res.render('index', { sets: result, role: role });
    });
});

app.get('/set', (req, res) => {
    const sid = req.query.id;
    const sql = `SELECT * FROM ttc_cards INNER JOIN ttc_sets ON ttc_cards.set_id = ttc_sets.id WHERE ttc_sets.id = ${sid};`;
    db.query(sql, (err, result) => {
        if (err) throw err;
        res.render('details', { cards: result, source: 'card' });
    });
});

app.get('/login', (req, res) => {
    let title = "Login";
    res.render('login', { tdata: title, source: 'login', error: ''});
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
            let sqlinsert = `INSERT INTO ttc_users (username, email, password, role) VALUES ("${username}", "${email}", "${password}", "member");`;
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
            // Set the user's role in the session
            req.session.role = result[0].role;
            // Redirect to '/'
            res.redirect('/');
        } else {
            // If email doesn't exist, render the login page with an error message
            res.render('login', { tdata: 'Login', source: 'login', error: 'Incorrect email or password'});
        }
    });
});

app.listen(PORT, () => {
    console.log(`App running on http://localhost:${PORT}`)
});
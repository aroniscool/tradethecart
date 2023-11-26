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

app.get('/login', (req, res) => {
    let title = "Login";
    res.render('login', { tdata: title, source: 'login' });
});

app.get('/signup', (req, res) => {
    let title = "Sign up";
    res.render('login', { tdata: title, source: 'signup' });
});

app.post('/signup', (req, res) => {
    const signup_username = req.body.signup_username;
    const signup_email = req.body.signup_username;
    let sqlinsert = `INSERT INTO ttc_users (username, email, role) VALUES ("${signup_username}", "${signup_email}", "member");`;
    db.query(sqlinsert, (err, result) => {
        if (err) throw err;
        res.send(`Congratulations ${signup_username}! You have successfully logged into our system!`)
    });
});

app.post('/login', (req, res) => {
    const useremail = req.body.login_email;
    const checkuser = `SELECT * FROM ttc_users WHERE email = "${useremail}"`;
    db.query(checkuser, (err, result) => {
        if (err) throw err;
        if (result.length > 0) {
            // Set the user's role in the session
            req.session.role = result[0].role;
            // Redirect to '/'
            res.redirect('/');
        } else {
            // If email doesn't exist, render the login page with an error message
            res.render('login', { tdata: 'Login', source: 'login'});
        }
    });
});


app.listen(PORT, () => {
    console.log(`App running on http://localhost:${PORT}`)
});
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

app.get('/', (req, res) => {
    let setsql = `SELECT * FROM ttc_sets`;
    db.query(setsql, (err, result) => {
        if (err) throw err;
        res.render('index', { sets : result });
    });
});

app.get('/login', (req, res) => {
    res.render('login')
});

/*
app.post('/login', (req,res) => {
    const useremail = req.body.emailField;
    const checkuser = `SELECT * FROM ttc_users WHERE email = "${useremail}" `;

    db.query(checkuser, (err, rows) => {
        if(err) throw err;
        const numRows = rows.length;
        
        if(numRows > 0){
            const sessionobj = req.session;  
            sessionobj.authen = rows[0].id; 
            res.redirect('/');
        }else{
            res.redirect('/login');
        }
        
    });
});
*/

app.listen(PORT, () => {
    console.log(`App running on http://localhost:${PORT}`)
});
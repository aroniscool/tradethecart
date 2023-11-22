const express = require("express");
const app = express();
const path = require("path");
const PORT = 3000;
const mysql = require('mysql2');
app.use(express.static(path.join(__dirname, "./public")));
app.set('view engine', 'ejs');

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

app.listen(PORT, () => {
    console.log(`App running on http://localhost:${PORT}`)
});
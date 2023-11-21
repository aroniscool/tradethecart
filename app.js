const express = require("express");
const app = express();
const path = require("path");
const PORT = 3000;
app.use(express.static(path.join(__dirname, "./public")));
app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index')
});

app.listen(PORT, () => {
    console.log(`App running on localhost:${PORT}`)
});
var express = require('express');
var pug = require('pug');

var app = express();

var port = process.env.PORT || 5000;

app.use(express.static('public'));
app.set('views', './src/views');
app.set('view engine', 'pug');

app.get('/', function (req, res) {
    res.render('index');
});

app.listen(port, function () {
    console.log('test environment listening on port ' + port);
});
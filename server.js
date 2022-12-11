require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.json());
const dns = require('dns');

const { MongoClient } = require('mongodb');
const HandlerController = require('./controllers/handlerController');


const databaseUrl = process.env.DATABASE;

app.set('port', process.env.PORT || 4100);
const server = app.listen(app.get('port'), () => {
    console.log(`Express running → PORT ${server.address().port}`);
});




MongoClient.connect(databaseUrl, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        app.locals.db = client.db('shortener');
    })
    .catch((err) => {

        console.error('Failed to connect to the database')
    });
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'public', 'index.html');
    res.sendFile(htmlPath);
});

app.post('/new', (req, res) => {

    let originalUrl;
    try {
        originalUrl = new URL(req.body.url);
    } catch (err) {
        return res.status(400).send({ error: 'invalid URL' });
    }

    dns.lookup(originalUrl.hostname, (err) => {
        if (err) {
            return res.status(404).send({ error: 'Address not found' });
        };
    });

    const { db } = req.app.locals;
    HandlerController.shortenURL(db, originalUrl.href)
        .then(result => {
            const doc = result.value;
            res.json({
                original_url: doc.original_url,
                short_id: doc.short_id,
            });
        })
        .catch(console.error);

});

app.get('/:short_id', (req, res) => {
    const shortId = req.params.short_id;

    const { db } = req.app.locals;


    HandlerController.checkIfShortIdExists(db, shortId)
        .then(doc => {
            if (doc === null) return res.send('Uh oh. We could not find a link at that URL');

            res.redirect(doc.original_url)
        })
        .catch(console.error);
});




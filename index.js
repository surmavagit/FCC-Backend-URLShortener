require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const dns = require('node:dns');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.post('/api/shorturl', express.urlencoded(), function(req, res) {
    const invalid = {error: 'Invalid URL'};
    const url = req.body.url;
    let prurl = '';
    if (url.startsWith('https://')) {
        prurl = url.slice('https://'.length);
    } else if (url.startsWith('http://')) {
        prurl = url.slice('http://'.length);
    }

    let host = '';
    if (prurl) {
        const pathIndex = prurl.indexOf('/');
        if (pathIndex != -1) {
            host = prurl.slice(0, prurl.indexOf('/'));
        } else {
            host = prurl;
        }
    }

    if (host) {
        dns.lookup(host, function(err, address, family) {
            if (err) {
                res.json(invalid);
            } else {
                res.json({original_url: url});
            }
        });
    } else {
        res.json(invalid);
    }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

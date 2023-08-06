require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("node:dns");

// Basic Configuration
const port = process.env.PORT || 3000;

const invalid = { error: "Invalid URL" };

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));
app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

async function parseUrl(req, res, next) {
  const url = req.body.url;
  const http = "http://";
  const https = "https://";
  if (!url.startsWith(http) && !url.startsWith(https)) {
    res.json(invalid);
  } else {
    let prurl = "";
    if (url.startsWith(https)) {
      prurl = url.slice(https.length);
    } else {
      prurl = url.slice(http.length);
    }
    if (!prurl) {
      res.json(invalid);
    } else {
      let host = "";
      const pathStartsAt = prurl.indexOf("/");
      if (pathStartsAt != -1) {
        host = prurl.slice(0, prurl.indexOf("/"));
      } else {
        host = prurl;
      }
      if (!host) {
        res.json(invalid);
      } else {
        req.data = host;
        next();
      }
    }
  }
}

async function dnsLookup(req, res) {
  dns.lookup(req.data, function (err, address, family) {
    if (err) {
      res.json(invalid);
    } else {
      res.json({original_url: req.body.url});
    }
  });
}

app.use(express.urlencoded())
app.post("/api/shorturl", parseUrl, dnsLookup);
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

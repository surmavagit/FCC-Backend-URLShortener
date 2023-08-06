require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const dns = require("node:dns");
const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const urlSchema = new mongoose.Schema({
  _id: {
    type: "UUID",
    default: () => randomUUID(),
  },
  original_url: {
    type: String,
    required: true,
  },
});
const Url = mongoose.model("url", urlSchema);

// Basic Configuration
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

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

async function dnsLookup(req, res, next) {
  dns.lookup(req.data, function (err, address, family) {
    if (err) {
      res.json(invalid);
    } else {
      next();
    }
  });
}

async function addToDatabase(req, res) {
  try {
    const monconnect = await mongoose.connect(mongoUri);
  } catch (err) {
    console.error(err);
    res.status(500).send("Can't connect to the database");
  }
  const userUrl = new Url({ original_url: req.body.url });
  console.log(userUrl);
  try {
    const writeResult = await userUrl.save();
    console.log(`Result: ${writeResult}`);
    res.json({ original_url: req.body.url });
  } catch (error) {
    console.error(error);
    res.status(500).send("Can't connect to the database");
  }
}

app.use(express.urlencoded());
app.post("/api/shorturl", parseUrl, dnsLookup, addToDatabase);
app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});

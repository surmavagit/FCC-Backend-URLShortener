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
  short_url: {
    type: Number,
    required: true,
  }
});

const Url = mongoose.model("url", urlSchema);

const mongoUri = process.env.MONGO_URI;

const invalid = { error: "Invalid URL" };

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

async function findInDatabase(req, res, next) {
  try {
    await mongoose.connect(mongoUri);
    const query = Url.where({ original_url: req.body.url });
    const knownUrl = await query.findOne();
    if (knownUrl === null) {
      next();
    } else {
      res.json({
        original_url: knownUrl.original_url,
        short_url: knownUrl.short_url,
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Can't connect to the database");
  }
}

async function addToDatabase(req, res) {
  try {
    await mongoose.connect(mongoUri);
    const urlCount = await Url.estimatedDocumentCount();
    const userUrl = {
      original_url: req.body.url,
      short_url: urlCount + 1,
    }
    const writeResult = await new Url(userUrl).save();
    res.json(userUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send("Can't connect to the database");
  }
}

module.exports = { parseUrl, dnsLookup, findInDatabase, addToDatabase };

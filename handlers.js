const dns = require("node:dns");
const mongoose = require("mongoose");

const urlSchema = new mongoose.Schema({
  original_url: {
    type: String,
    required: true,
  },
  short_url: {
    type: Number,
    required: true,
  },
});

const Url = mongoose.model("url", urlSchema);

const mongoUri = process.env.MONGO_URI;

const ErrorMessage = {
  invalid: { error: "Invalid URL" },
  connect: { error: "Can't connect to the database" },
};

async function parseUrl(req, res, next) {
  const url = (req.userUrl = req.body.url);
  const http = "http://";
  const https = "https://";
  if (!url.startsWith(http) && !url.startsWith(https)) {
    res.json(ErrorMessage.invalid);
  } else {
    let prurl = "";
    if (url.startsWith(https)) {
      prurl = url.slice(https.length);
    } else {
      prurl = url.slice(http.length);
    }
    if (!prurl) {
      res.json(ErrorMessage.invalid);
    } else {
      let host = "";
      const pathStartsAt = prurl.indexOf("/");
      if (pathStartsAt != -1) {
        host = prurl.slice(0, prurl.indexOf("/"));
      } else {
        host = prurl;
      }
      if (!host) {
        res.json(ErrorMessage.invalid);
      } else {
        req.userHost = host;
        next();
      }
    }
  }
}

async function dnsLookup(req, res, next) {
  dns.lookup(req.userHost, function (err, address, family) {
    if (err) {
      res.json(ErrorMessage.invalid);
    } else {
      next();
    }
  });
}

async function findInDatabase(req, res, next) {
  try {
    await mongoose.connect(mongoUri);
    const query = Url.where({ original_url: req.userUrl });
    req.dbUrl = await query.findOne();
    next();
  } catch (err) {
    console.error(err);
    res.status(500).send(ErrorMessage.connect);
  }
}

async function addToDatabase(req, res) {
  const dbUrl = req.dbUrl;
  if (dbUrl === null) {
    try {
      await mongoose.connect(mongoUri);
      const urlCount = await Url.estimatedDocumentCount();
      const userUrl = {
        original_url: req.userUrl,
        short_url: urlCount + 1,
      };
      const writeResult = await new Url(userUrl).save();
      res.json(userUrl);
    } catch (err) {
      console.error(err);
      res.status(500).send(ErrorMessage.connect);
    }
  } else {
    function filter({ original_url, short_url }) {
      return { original_url, short_url };
    }
    res.json(filter(dbUrl));
  }
}

module.exports = { parseUrl, dnsLookup, findInDatabase, addToDatabase };

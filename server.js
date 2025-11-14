import express from 'express';
import axios from 'axios';
import cors from 'cors';
import morgan from 'morgan';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import { createClient } from 'redis';

const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.json());

// ENV VARIABLES
const API_KEY = process.env.TWELVEDATA_KEY;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || "default_secret";
const BASIC_USER = process.env.BASIC_AUTH_USER;
const BASIC_PASS = process.env.BASIC_AUTH_PASS;
const REDIS_URL = process.env.REDIS_URL || null;

// BASIC AUTH CHECK
function checkBasicAuth(req, res) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Basic ")) {
    res.status(401).json({ error: "Missing Basic Auth" });
    return false;
  }
  const decoded = Buffer.from(auth.split(" ")[1], "base64").toString();
  const [user, pass] = decoded.split(":");

  if (user !== BASIC_USER || pass !== BASIC_PASS) {
    res.status(403).json({ error: "Invalid credentials" });
    return false;
  }
  return true;
}

// REDIS client
let redis = null;
if (REDIS_URL) {
  redis = createClient({ url: REDIS_URL });
  redis.connect().catch(console.error);
}

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// FETCH HISTORY (20 years)
app.get('/api/history', async (req, res) => {
  if (!checkBasicAuth(req, res)) return;

  const symbol = req.query.symbol;
  const interval = req.query.interval || '1h';
  const outputsize = req.query.outputsize || 20000;

  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}&interval=${interval}&apikey=${API_KEY}&outputsize=${outputsize}`;

  try {
    const r = await axios.get(url);
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// FETCH LIVE PRICE
app.get('/api/price', async (req, res) => {
  if (!checkBasicAuth(req, res)) return;

  const symbol = req.query.symbol;

  const url = `https://api.twelvedata.com/price?symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;

  try {
    const r = await axios.get(url);
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// TRADE QUEUE
app.post('/api/trade', async (req, res) => {
  if (!checkBasicAuth(req, res)) return;

  if (!redis) return res.status(500).json({ error: "Redis not enabled" });

  const trade = req.body;
  const id = Date.now();

  await redis.lPush("lumina_trade_queue", JSON.stringify({ id, ...trade }));

  res.json({ ok: true, trade_id: id });
});

// EA FETCH COMMAND
app.get('/api/commands', async (req, res) => {
  const eaId = req.query.ea;
  const signature = req.headers['x-lumina-signature'];

  const expected = crypto
    .createHmac("sha256", BRIDGE_SECRET)
    .update(eaId)
    .digest("hex");

  if (signature !== expected) {
    return res.status(403).json({ error: "Invalid EA signature" });
  }

  if (!redis) return res.status(500).json({ error: "Redis not enabled" });

  const cmd = await redis.rPop("lumina_trade_queue");

  if (!cmd) return res.json({ cmd: null });

  res.json({ cmd: JSON.parse(cmd) });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Lumina Bridge running on port ${PORT}`);
});

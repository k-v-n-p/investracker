import crypto from 'crypto';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

dotenv.config();

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_PASSWORD_HASH = process.env.AUTH_PASSWORD_HASH;
function withHttps(origin) {
  const v = (origin || '').trim();
  if (!v) return v;
  return /^https?:\/\//.test(v) ? v : `https://${v}`;
}

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const USER_ID = process.env.USER_ID || 'owner';

if (!MONGODB_URI || !JWT_SECRET || !AUTH_PASSWORD_HASH) {
  console.error('Missing required env: MONGODB_URI, JWT_SECRET, AUTH_PASSWORD_HASH');
  process.exit(1);
}

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors({
  origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map(s => withHttps(s.trim())),
  methods: ['GET', 'POST', 'PUT', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

let db;
let client;

async function connectDb() {
  client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db();
  await db.collection('portfolios').createIndex({ userId: 1 }, { unique: true });
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: !!db });
});

app.post('/api/auth/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (sha256(password) !== AUTH_PASSWORD_HASH) {
    return res.status(401).json({ error: 'Incorrect password' });
  }
  const token = jwt.sign({ sub: USER_ID }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

app.get('/api/data', authMiddleware, async (_req, res) => {
  try {
    const doc = await db.collection('portfolios').findOne(
      { userId: USER_ID },
      { projection: { _id: 0, userId: 0 } }
    );
    if (!doc) {
      return res.json({
        version: 1,
        settings: {},
        property_profiles: null,
        stock_holdings: [],
        stock_pnl_history: [],
      });
    }
    res.json({
      version: doc.version ?? 1,
      settings: doc.settings ?? {},
      property_profiles: doc.property_profiles ?? null,
      stock_holdings: doc.stock_holdings ?? [],
      stock_pnl_history: doc.stock_pnl_history ?? [],
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.error('GET /api/data', err);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

app.put('/api/data', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    const doc = {
      userId: USER_ID,
      version: body.version ?? 1,
      settings: body.settings ?? {},
      property_profiles: body.property_profiles ?? [],
      stock_holdings: body.stock_holdings ?? [],
      stock_pnl_history: body.stock_pnl_history ?? [],
      updatedAt: new Date().toISOString(),
    };
    await db.collection('portfolios').updateOne(
      { userId: USER_ID },
      { $set: doc },
      { upsert: true }
    );
    res.json({ ok: true, updatedAt: doc.updatedAt });
  } catch (err) {
    console.error('PUT /api/data', err);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

connectDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API listening on ${PORT}`));
  })
  .catch(err => {
    console.error('MongoDB connection failed', err);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  if (client) await client.close();
  process.exit(0);
});

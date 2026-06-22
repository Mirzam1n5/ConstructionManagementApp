const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

// ─── PostgreSQL ──────────────────────────────────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // required on Render
});

// Create table if it doesn't exist
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sheets (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ DB ready');
}

// ─── Middleware ──────────────────────────────────────────────────
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── API endpoints ───────────────────────────────────────────────
// GET /api/sheets
app.get('/api/sheets', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, label FROM sheets ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

// POST /api/sheets
app.post('/api/sheets', async (req, res) => {
  const { id, label } = req.body;
  if (!id || !label) return res.status(400).json({ error: 'Missing id or label' });

  try {
    await pool.query(
      'INSERT INTO sheets (id, label) VALUES ($1, $2)',
      [id, label]
    );
    res.status(201).json({ id, label });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Sheet already exists' });
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

// DELETE /api/sheets/:id
app.delete('/api/sheets/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM sheets WHERE id = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Sheet not found' });
    res.json({ success: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

// ─── Static / SPA ────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js'))   res.setHeader('Content-Type', 'application/javascript');
    else if (filePath.endsWith('.css'))  res.setHeader('Content-Type', 'text/css');
    else if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
  }
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ─── Start ───────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`ISKER running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to init DB:', err);
  process.exit(1);
});

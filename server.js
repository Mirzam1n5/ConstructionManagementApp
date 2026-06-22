const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// In-memory storage for extra sheets (persists during runtime)
// On restart, loads from sheets.json if it exists
const sheetsFile = path.join(__dirname, 'sheets.json');
let extraSheets = [];

// Load sheets from file on startup
if (fs.existsSync(sheetsFile)) {
  try {
    extraSheets = JSON.parse(fs.readFileSync(sheetsFile, 'utf-8'));
  } catch (e) {
    console.warn('Failed to load sheets.json, starting fresh');
    extraSheets = [];
  }
}

// Middleware
app.use(express.json());

// CORS — allow mobile/web clients to call /api/*
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ─── API endpoints ──────────────────────────────────────────────
// GET /api/sheets — returns list of all extra sheets for all users
app.get('/api/sheets', (req, res) => {
  res.json(extraSheets);
});

// POST /api/sheets — add a new sheet
app.post('/api/sheets', (req, res) => {
  const { id, label } = req.body;
  
  if (!id || !label) {
    return res.status(400).json({ error: 'Missing id or label' });
  }
  
  // Check if already exists
  if (extraSheets.some(s => s.id === id)) {
    return res.status(409).json({ error: 'Sheet already exists' });
  }
  
  // Add new sheet
  const newSheet = { id, label };
  extraSheets.push(newSheet);
  
  // Persist to file
  fs.writeFileSync(sheetsFile, JSON.stringify(extraSheets, null, 2));
  
  res.status(201).json(newSheet);
});

// DELETE /api/sheets/:id — remove a sheet
app.delete('/api/sheets/:id', (req, res) => {
  const { id } = req.params;
  const before = extraSheets.length;
  extraSheets = extraSheets.filter(s => s.id !== id);
  
  if (extraSheets.length === before) {
    return res.status(404).json({ error: 'Sheet not found' });
  }
  
  // Persist to file
  fs.writeFileSync(sheetsFile, JSON.stringify(extraSheets, null, 2));
  
  res.json({ success: true });
});

// Serve static files from dist with correct MIME types
app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
  }
}));

// SPA fallback — all routes → index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ISKER running on port ${PORT}`);
  console.log(`📊 API: GET/POST /api/sheets`);
});

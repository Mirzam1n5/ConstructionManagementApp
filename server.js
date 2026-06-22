const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;
// ─── Storage: Upstash Redis (Fixed REST API Integration) ──────────────
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const REDIS_KEY = 'isker_sheets';
// Безопасное удаление лишних слэшей из URL
const cleanUrl = UPSTASH_URL ? UPSTASH_URL.replace(/\/$/, '') : null;
async function redisGet() {
if (!cleanUrl || !UPSTASH_TOKEN) {
console.warn(' Upstash env vars are missing');
return null;

}
try {
const res = await fetch(`${cleanUrl}/get/${REDIS_KEY}`, {
headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
});
if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
const json = await res.json();
// Upstash возвращает { result: "строка_данных" } или { result: null }
return json.result ? JSON.parse(json.result) : null;
} catch (error) {
console.error(' Error reading from Redis:', error.message);
return null;
}
}
async function redisSet(value) {
if (!cleanUrl || !UPSTASH_TOKEN) return;
try {
// Для эндпоинта /set/:key в body отправляем СТРОКУ, а не массив
const res = await fetch(`${cleanUrl}/set/${REDIS_KEY}`, {
method: 'POST',
headers: {
Authorization: `Bearer ${UPSTASH_TOKEN}`,
'Content-Type': 'application/json' // Передаем как валдиный JSON string
},
body: JSON.stringify(JSON.stringify(value))
});
if (!res.ok) {
const errText = await res.text();
throw new Error(`Status: ${res.status}, Message: ${errText}`);
}
console.log('✓ Data successfully synced to Upstash Redis');
} catch (error) {
console.error(' Error writing to Redis:', error.message);
}
}
// In-memory глобальный кэш сервера
let extraSheets = [];
// Инициализация данных при старте сервера
(async () => {
try {
const stored = await redisGet();
if (Array.isArray(stored)) {
extraSheets = stored;
console.log(`✓ Initialized: Loaded ${extraSheets.length} sheets from Redis`);
} else {
console.log('i No sheets found in Redis, starting with empty list');
}
} catch (e) {
console.warn(' Redis unavailable during startup, using empty memory store');
}
})();
// ─── Middleware ─────────────────────────────────────────────────
app.use(express.json());
app.use((req, res, next) => {
res.header('Access-Control-Allow-Origin', '*');
res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
res.header('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.sendStatus(200);
next();
});
// ─── API Endpoints ──────────────────────────────────────────────
app.get('/api/sheets', (req, res) => {
res.json(extraSheets);
});
app.post('/api/sheets', async (req, res) => {
const { id, label } = req.body;
if (!id || !label) return res.status(400).json({ error: 'Missing id or label' });
if (extraSheets.some(s => s.id === id)) {
return res.status(409).json({ error: 'Sheet already exists' });
}
extraSheets.push({ id, label });
// Дожидаемся успешной записи в облако перед ответом клиенту
await redisSet(extraSheets);
res.status(201).json({ id, label });
});
app.delete('/api/sheets/:id', async (req, res) => {
const { id } = req.params;
const before = extraSheets.length;
extraSheets = extraSheets.filter(s => s.id !== id);

if (extraSheets.length === before) {
return res.status(404).json({ error: 'Sheet not found' });
}
await redisSet(extraSheets);
res.json({ success: true });
});
// ─── Static + SPA ───────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'dist'), {
setHeaders: (res, filePath) => {
if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
if (filePath.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
}
}));
app.get('*', (req, res) =>
res.sendFile(path.join(__dirname, 'dist', 'index.html'))
);
app.listen(PORT, () => console.log(` ISKER running on port ${PORT}`));
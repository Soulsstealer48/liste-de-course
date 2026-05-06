const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3030;
const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = path.join(DATA_DIR, 'lists.db');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new sqlite3.Database(DB_PATH);

const run = (sql, params = []) => new Promise((res, rej) =>
  db.run(sql, params, function (err) { err ? rej(err) : res(this); })
);
const all = (sql, params = []) => new Promise((res, rej) =>
  db.all(sql, params, (err, rows) => err ? rej(err) : res(rows))
);
const get = (sql, params = []) => new Promise((res, rej) =>
  db.get(sql, params, (err, row) => err ? rej(err) : res(row))
);

async function init() {
  await run(`CREATE TABLE IF NOT EXISTS lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  await run(`CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    checked INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (list_id) REFERENCES lists(id) ON DELETE CASCADE
  )`);
  await run('PRAGMA foreign_keys = ON');
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve SVG icon under PNG names for PWA manifest
app.get('/icon-:size.png', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.sendFile(path.join(__dirname, 'public', 'icon.svg'));
});

// Lists
app.get('/api/lists', async (req, res) => {
  const lists = await all(`
    SELECT l.*, COUNT(i.id) as item_count,
           SUM(CASE WHEN i.checked = 0 THEN 1 ELSE 0 END) as unchecked_count
    FROM lists l
    LEFT JOIN items i ON i.list_id = l.id
    GROUP BY l.id
    ORDER BY l.created_at DESC
  `);
  res.json(lists);
});

app.post('/api/lists', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nom requis' });
  const result = await run('INSERT INTO lists (name) VALUES (?)', [name.trim()]);
  const list = await get('SELECT * FROM lists WHERE id = ?', [result.lastID]);
  res.status(201).json(list);
});

app.delete('/api/lists/:id', async (req, res) => {
  await run('PRAGMA foreign_keys = ON');
  await run('DELETE FROM lists WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

// Items
app.get('/api/lists/:id/items', async (req, res) => {
  const items = await all(`
    SELECT * FROM items WHERE list_id = ?
    ORDER BY checked ASC, created_at ASC
  `, [req.params.id]);
  res.json(items);
});

app.post('/api/lists/:id/items', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nom requis' });
  const result = await run('INSERT INTO items (list_id, name) VALUES (?, ?)', [req.params.id, name.trim()]);
  const item = await get('SELECT * FROM items WHERE id = ?', [result.lastID]);
  res.status(201).json(item);
});

app.patch('/api/items/:id', async (req, res) => {
  const { checked, name } = req.body;
  if (checked !== undefined) {
    await run('UPDATE items SET checked = ? WHERE id = ?', [checked ? 1 : 0, req.params.id]);
  }
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Nom requis' });
    await run('UPDATE items SET name = ? WHERE id = ?', [name.trim(), req.params.id]);
  }
  const item = await get('SELECT * FROM items WHERE id = ?', [req.params.id]);
  res.json(item);
});

app.delete('/api/items/:id', async (req, res) => {
  await run('DELETE FROM items WHERE id = ?', [req.params.id]);
  res.json({ ok: true });
});

app.delete('/api/lists/:id/items/checked', async (req, res) => {
  await run('DELETE FROM items WHERE list_id = ? AND checked = 1', [req.params.id]);
  res.json({ ok: true });
});

init().then(() => {
  app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
});
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3030;
const DATA_DIR = process.env.DATA_DIR || './data';
const DATA_FILE = path.join(DATA_DIR, 'data.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function load() {
  if (!fs.existsSync(DATA_FILE)) return { lists: [], items: [], nextListId: 1, nextItemId: 1 };
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/icon-:size.png', (req, res) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.sendFile(path.join(__dirname, 'public', 'icon.svg'));
});

// Lists
app.get('/api/lists', (req, res) => {
  const { lists, items } = load();
  const result = lists.map(l => {
    const listItems = items.filter(i => i.list_id === l.id);
    return {
      ...l,
      item_count: listItems.length,
      unchecked_count: listItems.filter(i => !i.checked).length,
    };
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));
  res.json(result);
});

app.post('/api/lists', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nom requis' });
  const data = load();
  const list = { id: data.nextListId++, name: name.trim(), created_at: new Date().toISOString() };
  data.lists.push(list);
  save(data);
  res.status(201).json(list);
});

app.delete('/api/lists/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = load();
  data.lists = data.lists.filter(l => l.id !== id);
  data.items = data.items.filter(i => i.list_id !== id);
  save(data);
  res.json({ ok: true });
});

// Items
app.get('/api/lists/:id/items', (req, res) => {
  const id = parseInt(req.params.id);
  const { items } = load();
  const result = items
    .filter(i => i.list_id === id)
    .sort((a, b) => a.checked - b.checked || a.created_at.localeCompare(b.created_at));
  res.json(result);
});

app.post('/api/lists/:id/items', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Nom requis' });
  const data = load();
  const item = { id: data.nextItemId++, list_id: parseInt(req.params.id), name: name.trim(), checked: false, created_at: new Date().toISOString() };
  data.items.push(item);
  save(data);
  res.status(201).json(item);
});

app.patch('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = load();
  const item = data.items.find(i => i.id === id);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  if (req.body.checked !== undefined) item.checked = !!req.body.checked;
  if (req.body.name !== undefined) {
    if (!req.body.name.trim()) return res.status(400).json({ error: 'Nom requis' });
    item.name = req.body.name.trim();
  }
  save(data);
  res.json(item);
});

app.delete('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = load();
  data.items = data.items.filter(i => i.id !== id);
  save(data);
  res.json({ ok: true });
});

app.delete('/api/lists/:id/items/checked', (req, res) => {
  const id = parseInt(req.params.id);
  const data = load();
  data.items = data.items.filter(i => !(i.list_id === id && i.checked));
  save(data);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
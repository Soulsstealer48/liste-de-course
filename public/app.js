const api = {
  async get(url) { const r = await fetch(url); return r.json(); },
  async post(url, data) { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return r.json(); },
  async patch(url, data) { const r = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); return r.json(); },
  async del(url) { const r = await fetch(url, { method: 'DELETE' }); return r.json(); },
};

let currentListId = null;
let shoppingMode = false;

const viewLists      = document.getElementById('view-lists');
const viewItems      = document.getElementById('view-items');
const listsContainer = document.getElementById('lists-container');
const itemsContainer = document.getElementById('items-container');
const inputNewList   = document.getElementById('input-new-list');
const inputNewItem   = document.getElementById('input-new-item');
const btnAddList     = document.getElementById('btn-add-list');
const btnAddItem     = document.getElementById('btn-add-item');
const btnBack        = document.getElementById('btn-back');
const btnShopping    = document.getElementById('btn-shopping');
const btnClearChecked = document.getElementById('btn-clear-checked');
const headerTitle    = document.getElementById('header-title');
const headerSubtitle = document.getElementById('header-subtitle');
const metaTheme      = document.getElementById('meta-theme');

// ── Navigation ──
function showListsView() {
  viewLists.classList.add('active');
  viewItems.classList.remove('active');
  btnBack.style.display = 'none';
  btnShopping.style.display = 'none';
  headerTitle.textContent = '🛒 Mes listes';
  headerSubtitle.style.display = 'none';
  currentListId = null;
  shoppingMode = false;
  document.body.classList.remove('shopping-mode');
  metaTheme.setAttribute('content', '#2e7d32');
  loadLists();
}

async function showItemsView(listId, listName) {
  currentListId = listId;
  viewLists.classList.remove('active');
  viewItems.classList.add('active');
  btnBack.style.display = 'flex';
  btnShopping.style.display = 'block';
  btnShopping.textContent = 'Mode courses';
  headerTitle.textContent = listName;
  headerSubtitle.style.display = 'block';
  headerSubtitle.textContent = '';
  await loadItems();
}

// ── Lists ──
async function loadLists() {
  const lists = await api.get('/api/lists');
  if (lists.length === 0) {
    listsContainer.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🛍️</div>
        Aucune liste pour l'instant.<br>Créez votre première liste ci-dessous.
      </div>`;
    return;
  }
  listsContainer.innerHTML = lists.map(l => renderListCard(l)).join('');
  attachListEvents();
}

function renderListCard(l, confirming = false) {
  const count = l.unchecked_count ?? l.item_count;
  const label = count === 0
    ? (l.item_count === 0 ? 'Liste vide' : 'Tout coché ✓')
    : `${count} article${count > 1 ? 's' : ''}`;

  if (confirming) {
    return `
      <div class="list-card confirming" data-id="${l.id}" data-name="${escHtml(l.name)}">
        <span class="list-card-icon">🗑️</span>
        <div class="list-card-info">
          <div class="list-card-name">Supprimer ?</div>
          <div class="list-card-count">${escHtml(l.name)}</div>
        </div>
        <div class="confirm-actions">
          <button class="btn-confirm-no" data-id="${l.id}">Annuler</button>
          <button class="btn-confirm-yes" data-id="${l.id}">Supprimer</button>
        </div>
      </div>`;
  }

  return `
    <div class="list-card" data-id="${l.id}" data-name="${escHtml(l.name)}">
      <span class="list-card-icon">📋</span>
      <div class="list-card-info">
        <div class="list-card-name">${escHtml(l.name)}</div>
        <div class="list-card-count">${label}</div>
      </div>
      <button class="list-card-delete" data-id="${l.id}" aria-label="Supprimer la liste">🗑</button>
    </div>`;
}

function attachListEvents() {
  listsContainer.querySelectorAll('.list-card:not(.confirming)').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.list-card-delete')) return;
      showItemsView(card.dataset.id, card.dataset.name);
    });
  });

  listsContainer.querySelectorAll('.list-card-delete').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      startConfirmDelete(btn.dataset.id);
    });
  });

  listsContainer.querySelectorAll('.btn-confirm-no').forEach(btn => {
    btn.addEventListener('click', () => loadLists());
  });

  listsContainer.querySelectorAll('.btn-confirm-yes').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.del(`/api/lists/${btn.dataset.id}`);
      loadLists();
    });
  });
}

async function startConfirmDelete(id) {
  const lists = await api.get('/api/lists');
  const list = lists.find(l => String(l.id) === String(id));
  if (!list) return;

  const card = listsContainer.querySelector(`.list-card[data-id="${id}"]`);
  if (!card) return;
  card.outerHTML = renderListCard(list, true);
  attachListEvents();
}

async function addList() {
  const name = inputNewList.value.trim();
  if (!name) return;
  await api.post('/api/lists', { name });
  inputNewList.value = '';
  loadLists();
}

// ── Items ──
async function loadItems() {
  const items = await api.get(`/api/lists/${currentListId}/items`);
  updateSubtitle(items);

  if (items.length === 0) {
    itemsContainer.innerHTML = `
      <div class="empty">
        <div class="empty-icon">📝</div>
        La liste est vide.<br>Ajoutez votre premier article ci-dessous.
      </div>`;
    return;
  }

  itemsContainer.innerHTML = items.map(item => `
    <div class="item-row ${item.checked ? 'checked' : ''}" data-id="${item.id}">
      <div class="item-check" data-id="${item.id}" role="checkbox" aria-checked="${item.checked ? 'true' : 'false'}">
        <div class="item-check-circle">${item.checked ? '✓' : ''}</div>
      </div>
      <span class="item-name">${escHtml(item.name)}</span>
      <button class="item-delete" data-id="${item.id}" aria-label="Supprimer ${escHtml(item.name)}">✕</button>
    </div>
  `).join('');

  itemsContainer.querySelectorAll('.item-check').forEach(btn => {
    btn.addEventListener('click', () => toggleItem(btn.dataset.id));
  });
  itemsContainer.querySelectorAll('.item-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.dataset.id));
  });
}

function updateSubtitle(items) {
  const total = items.length;
  const checked = items.filter(i => i.checked).length;
  if (total === 0) { headerSubtitle.textContent = ''; return; }
  headerSubtitle.textContent = `${checked}/${total} coché${checked > 1 ? 's' : ''}`;
}

async function addItem() {
  const name = inputNewItem.value.trim();
  if (!name) return;
  await api.post(`/api/lists/${currentListId}/items`, { name });
  inputNewItem.value = '';
  loadItems();
}

async function toggleItem(id) {
  const row = document.querySelector(`.item-row[data-id="${id}"]`);
  const isChecked = row.classList.contains('checked');
  await api.patch(`/api/items/${id}`, { checked: !isChecked });
  loadItems();
}

async function deleteItem(id) {
  await api.del(`/api/items/${id}`);
  loadItems();
}

async function clearChecked() {
  if (!currentListId) return;
  await api.del(`/api/lists/${currentListId}/items/checked`);
  loadItems();
}

// ── Mode courses ──
function toggleShoppingMode() {
  shoppingMode = !shoppingMode;
  document.body.classList.toggle('shopping-mode', shoppingMode);
  btnShopping.textContent = shoppingMode ? 'Quitter' : 'Mode courses';
  metaTheme.setAttribute('content', shoppingMode ? '#1a237e' : '#2e7d32');
}

// ── Helpers ──
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Events ──
btnAddList.addEventListener('click', addList);
inputNewList.addEventListener('keydown', e => { if (e.key === 'Enter') addList(); });
btnAddItem.addEventListener('click', addItem);
inputNewItem.addEventListener('keydown', e => { if (e.key === 'Enter') addItem(); });
btnBack.addEventListener('click', showListsView);
btnShopping.addEventListener('click', toggleShoppingMode);
btnClearChecked.addEventListener('click', clearChecked);

// ── Init ──
loadLists();
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run locally
npm start           # starts server on port 3030

# Docker (local build)
docker build -t liste-de-course .
docker run -p 3030:3030 -v liste-data:/data liste-de-course

# Docker Compose (production, pulls from GHCR)
docker compose up -d
```

There are no tests and no linter configured.

## Architecture

Single-file Express server (`server.js`) serving a vanilla JS SPA from `public/`.

**Data layer** — no database. All state lives in `data/data.json` (or `$DATA_DIR/data.json`). The `load()` / `save()` functions read and write the whole JSON file on every request. The schema is:
```json
{ "lists": [...], "items": [...], "nextListId": N, "nextItemId": N }
```
Items carry a `list_id` foreign key; cascade-delete of a list also removes its items.

**API** (`server.js`):
- `GET/POST /api/lists` — list all (with computed `item_count` / `unchecked_count`) or create
- `DELETE /api/lists/:id` — deletes list and all its items
- `GET/POST /api/lists/:id/items` — items sorted: unchecked first, then by `created_at`
- `PATCH /api/items/:id` — toggle `checked` or rename
- `DELETE /api/items/:id`
- `DELETE /api/lists/:id/items/checked` — bulk-remove checked items

**Frontend** (`public/app.js` + `public/index.html`) — no framework, no bundler. Two views rendered via CSS (`.view` / `.view.active`): the lists view and the items view. State is two module-level variables: `currentListId` and `shoppingMode`. Every mutating action re-fetches from the server and re-renders the whole container.

Shopping mode (`body.shopping-mode`) enlarges tap targets, hides the add form and delete buttons, and changes the header color to dark blue — intended for use while physically shopping.

The app is a PWA (manifest + apple meta tags). Icons are served as SVG regardless of the requested PNG size.

## Deployment

Pushes to `main` trigger GitHub Actions which builds a multi-arch image (`amd64`, `arm64`, `arm/v7`) and pushes it to `ghcr.io/soulsstealer48/liste-de-course:latest`.

Production runs on a Raspberry Pi at `192.168.1.175:3030` behind Nginx Proxy Manager, managed by Portainer using the `docker-compose.yml` at the repo root. Data is persisted in the `liste-data` Docker volume at `/data`.
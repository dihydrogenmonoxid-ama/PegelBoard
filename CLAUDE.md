# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

PegelBoard is a kiosk dashboard for water-rescue units (DLRG etc.) running fullscreen on a Raspberry Pi. It shows gauge levels, weather, wind, and emergency warnings at a glance. The project is a Node.js monorepo with two workspaces.

## Commands

```bash
# Install all dependencies
npm install

# Start both servers concurrently (frontend :5173, backend :4000)
npm run dev

# Workspace-specific dev
npm run dev --workspace=frontend
npm run dev --workspace=backend

# Type-check both packages
npm run typecheck

# Lint both packages
npm run lint

# Production build (backend first, then frontend)
npm run build
```

Backend dev uses `tsx watch` (no compile step needed). Frontend uses Vite; `/api` and `/ws` are proxied to `http://localhost:4000`. In production, the backend serves the built frontend statically via `@fastify/static` — only one process runs.

## Architecture

### Monorepo Layout

```
pegelboard/
├── frontend/    # Vite + React 19 + TailwindCSS v4 + Framer Motion + Recharts + Leaflet
└── backend/     # Fastify 5, Node.js built-in SQLite (node:sqlite), tsx watch
```

### Backend (`backend/src/`)

- **`index.ts`** — Fastify server entry point. Registers plugins and routes, then calls `startPolling()` which reads configured stations from SQLite and broadcasts gauge updates via WebSocket every `poll_interval_ms` ms (default 2 min). Also drives GPIO signal tower output after each poll. In production (`NODE_ENV=production`), serves the built frontend via `@fastify/static`.
- **`db/database.ts`** — SQLite via Node.js built-in `node:sqlite` (`DatabaseSync`). WAL mode enabled. Creates tables on startup and runs inline migrations. Tables: `users`, `layouts`, `config` (key-value), `gauge_stations`, `source_status`, `einsatz_log`, `einsatzmittel`, `aao_icons`. The `gauge_stations` table has a `simulate_alarm` column for testing alarm states without hitting real thresholds.
- **`plugins/auth.ts`** — Fastify plugin (wrapped with `fastify-plugin` to avoid scope encapsulation). Registers `@fastify/cookie` + `@fastify/jwt`. Decorates the instance with `fastify.authenticate`. JWT stored in `pb_token` HttpOnly cookie (8h session).
- **`plugins/websocket.ts`** — Manages a `Set<Client>` of active WS connections. Exposes `broadcast(event, data)` used by the polling loop. Endpoint: `GET /ws`.
- **`lib/password.ts`** — scrypt-based password hashing using Node.js `node:crypto`. First login lazily upgrades the placeholder `CHANGEME` hash to a real hash for `admin`/`wasser`.
- **`lib/cache.ts`** — Records fetch success/failure into the `source_status` table via `recordFetchSuccess(source)` / `recordFetchError(source, err)`. Used by the polling loop and route handlers to track data freshness.
- **`lib/gpio.ts`** — Signal tower control via the `onoff` npm package. Gracefully no-ops on non-Linux (dev/macOS). Only active on Raspberry Pi. `setGpioLevel(pin, value)` / `releaseAll()`.
- **`services/`** — External API clients (stateless, routes call these directly):
  - `pegelonline.ts` — PEGELONLINE REST API v2
  - `brightsky.ts` — Brightsky (DWD weather data)
  - `dwd.ts` — DWD warnings (XML/JSON via `fast-xml-parser`)
  - `nina.ts` — NINA / MoWaS alerts
  - `tagesschau.ts` — Tagesschau news ticker
  - `opensky.ts` — OpenSky Network helicopter tracking (optional API key)
  - `mdr.ts` — MDR regional news
- **`routes/`** — All public routes under `/api/`. Admin routes under `routes/admin/` require `{ onRequest: [fastify.authenticate] }`. Rate limiting is available via `@fastify/rate-limit` but disabled globally (`global: false`) — routes opt in. File uploads (AAO icons) use `@fastify/multipart` with a 2 MB limit.

### Frontend (`frontend/src/`)

- **`main.tsx`** → **`App.tsx`** — React Router v7 with two top-level areas:
  - `/` → `Dashboard` (public, no auth)
  - `/admin/*` → `AdminLayout` with nested pages (protected by `ProtectedRoute` which hits `/api/auth/me`)
- **`api.ts`** — Thin fetch wrapper (`api.get/post/put/del`). Always sends `credentials: 'include'` for cookie auth. Throws `ApiError` on non-2xx.
- **`hooks/useWebSocket.ts`** — Auto-reconnecting WebSocket hook (5s backoff). Passes `{ event, data }` frames to a stable handler ref.
- **`pages/Dashboard.tsx`** — Main kiosk view. Loads `PublicConfig` from `/api/config/public` on mount, applies CSS custom properties for theme colors and applies `data-theme` to `<html>`. Layout is a fixed CSS grid (`300px | 1fr | 280px` columns, `auto | 1fr | auto` rows for top bar / content / bottom bar). Helicopter polling runs every 60 s when `opensky_enabled` is set.
- **`components/`** — One file per widget:
  - `TopBar` — clock, sunrise/sunset, WS status, `PegelBoardMark` indicator
  - `BottomBar` — warnings ticker (`WarningsWidget`) + news
  - `GaugeWidget` — gauge readings with alarm animation
  - `MapWidget` — Leaflet map with `HelicopterLayer` and `RainRadarLayer`
  - `WeatherWidget`, `WindWidget`, `ForecastWidget`
  - `PegelBoardMark` — animated status dot (live / alarm)
- **`index.css`** — All CSS custom properties (design tokens). Dark/light theme via `[data-theme]` on `<html>`. `glass` utility class for frosted-glass card style.

### Data Flow

```
PEGELONLINE / DWD / NINA / Brightsky / OpenSky
        ↓  (backend services)
   Fastify routes  ←→  SQLite (config, stations, layouts, ops log, resources)
        ↓
   REST /api/*  +  WebSocket /ws
        ↓
   React frontend  →  widgets re-render on gauge:update events
        ↓
   GPIO signal tower  ←  polling loop (max warn level across all stations)
```

## Key Constraints

- **`node:sqlite`** is Node.js 26+ built-in — no `better-sqlite3` or similar. Use `DatabaseSync` (synchronous API).
- **Auth** is cookie-JWT only. The `authenticate` decorator is on the root Fastify scope because `authPlugin` is wrapped with `fp()` (fastify-plugin). Admin routes call `{ onRequest: [fastify.authenticate] }`.
- **CSS theming**: Use `var(--theme-*)` tokens for colors, not hardcoded Tailwind classes. Warn colors (`--color-warn-*`) are overridable at runtime via admin config and applied as inline CSS custom properties on `<html>`.
- **Dashboard layout** is a fixed CSS grid in `Dashboard.tsx` — not driven by `react-grid-layout`. The `dashboard_layout` config key is used by the admin layout editor (`LayoutPage`).
- **Framer Motion** is installed and available for animations.
- **Migrations** are inline in `database.ts` using `ALTER TABLE … ADD COLUMN` wrapped in try/catch (safe to run every boot).

## Color Tokens

| CSS var | Default | Usage |
|---|---|---|
| `--color-warn-normal` | `#22c55e` | Gauge OK |
| `--color-warn-elevated` | `#fbbf24` | Elevated |
| `--color-warn-critical` | `#f08a24` | Critical |
| `--color-warn-alarm` | `#E30613` | Alarm |
| `--color-pb-signal` | `#0a6cb0` | Brand blue |
| `--theme-bg` | varies | Page background |
| `--theme-card` | varies | Card background |
| `--theme-text` | varies | Primary text |
| `--theme-text-muted` | varies | Secondary text |
| `--theme-text-faint` | varies | Tertiary text |

## Environment Variables

Backend (all optional):

| Var | Default |
|---|---|
| `PORT` | `4000` |
| `HOST` | `0.0.0.0` |
| `FRONTEND_URL` | `http://localhost:3000` (CORS in dev only) |
| `JWT_SECRET` | `pegelboard-dev-secret-CHANGE-IN-PRODUCTION` |
| `DB_PATH` | `./pegelboard.db` |
| `POLL_INTERVAL_MS` | `120000` (also readable from `config` table) |
| `LOG_LEVEL` | `info` |

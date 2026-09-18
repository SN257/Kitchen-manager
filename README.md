# Kitchen Manager

A kitchen/event management app with two parts:

- **kitchen-manager-backend** — NestJS + TypeORM API, backed by PostgreSQL.
- **kitchen-manager-frontend** — Vite + React SPA, served in production via Nginx.

## Local development

1. Clone the repository.
2. Run `npm install` in both `kitchen-manager-backend` and `kitchen-manager-frontend`.
3. Set up a PostgreSQL database locally.
4. Create a `.env` file in `kitchen-manager-backend` with:
   ```
   DATABASE_URL=postgres://your_username:your_password@localhost:5432/your_dbname
   ```
5. Generate a migration: `npm run migration:generate` (in `kitchen-manager-backend`).
6. Run migrations: `npm run migration:run` (in `kitchen-manager-backend`).
7. Start the backend: `npm run start:dev` (in `kitchen-manager-backend`).
8. Start the frontend: `npm run dev` (in `kitchen-manager-frontend`).

## Docker

Each app has its own production `Dockerfile`:

- [`kitchen-manager-backend/Dockerfile`](kitchen-manager-backend/Dockerfile) — multi-stage build, runs `node dist/src/main`, listens on `PORT` (default `3000`). Migrations run automatically on startup (`migrationsRun: true`).
- [`kitchen-manager-frontend/Dockerfile`](kitchen-manager-frontend/Dockerfile) — builds the Vite app (needs `VITE_API_BASE_URL` as a **build arg**, since Vite inlines env vars at build time) and serves the static output with Nginx on port `80`.

A root [`docker-compose.yml`](docker-compose.yml) ties both apps together with a PostgreSQL database for local Docker testing or single-server deployment.

### Run everything with Docker Compose locally

```bash
cp .env.example .env
# edit .env: set POSTGRES_PASSWORD, SESSION_SECRET, VITE_API_BASE_URL, etc.
docker compose up --build
```

- Frontend: http://localhost
- Backend: http://localhost:3000

## Deploying to Coolify

Coolify can deploy this repo either as a **single Docker Compose resource** (recommended — one resource manages backend, frontend and Postgres together) or as **two separate Dockerfile-based resources** plus a managed Coolify Postgres database.

### Option A — Docker Compose (recommended)

1. In Coolify, create a new resource → **Docker Compose**, and point it at this repository.
2. Set the **Compose file location** to `docker-compose.yml` (repo root).
3. In the resource's **Environment Variables**, set (matching [`.env.example`](.env.example)):
   - `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
   - `SESSION_SECRET` (long random string), `SESSION_COOKIE_NAME` (optional)
   - `CORS_ORIGINS` — the frontend's public URL, e.g. `https://kitchen.example.com`
   - `VITE_API_BASE_URL` — the backend's public URL, e.g. `https://api.example.com` (this is a **build-time** value: changing it requires a rebuild, not just a redeploy)
4. In Coolify, assign a domain to the `frontend` service (port `80`) and a domain to the `backend` service (port `3000`) — Coolify's proxy provides HTTPS automatically via Let's Encrypt.
5. Deploy. On first boot, the backend automatically runs pending TypeORM migrations before serving traffic.

### Option B — Two separate Dockerfile resources

1. Create a Coolify **Postgres** database resource and copy its internal connection string.
2. Create a resource from this repo for the **backend**:
   - Base directory: `kitchen-manager-backend`
   - Dockerfile: `Dockerfile`
   - Port: `3000`
   - Env vars: `DATABASE_URL` (from step 1), `SESSION_SECRET`, `CORS_ORIGINS` (frontend's public URL), `NODE_ENV=production`
3. Create a resource from this repo for the **frontend**:
   - Base directory: `kitchen-manager-frontend`
   - Dockerfile: `Dockerfile`
   - Port: `80`
   - Build arg: `VITE_API_BASE_URL` set to the backend's public URL
4. Assign domains to both resources and deploy the backend first so the frontend can reach it.

### Notes

- Cross-site cookies (session auth) require both services to be served over **HTTPS** in production — Coolify's default Let's Encrypt proxy covers this once domains are assigned.
- If frontend and backend end up on different domains, make sure `CORS_ORIGINS` (backend) and `VITE_API_BASE_URL` (frontend) match each other exactly (scheme + host, no trailing slash).
- `VITE_API_BASE_URL` is baked into the frontend bundle at build time — redeploy **with a rebuild** whenever it changes, not just a restart.

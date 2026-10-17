# ConMat

## Structure

- `frontend/` — React + Vite UI
- `backend/` — Node.js + Express + Sequelize API

## Run on localhost

1. Install a supported current Node.js release (Vite 8 requires a modern Node.js version) and PostgreSQL.
2. From this root folder run `npm install`.
3. Copy `backend/.env.example` to `backend/.env` and replace it with your own backend environment values.
4. Copy `frontend/.env.example` to `frontend/.env` and set the Stripe publishable key if payment testing is required.
5. Make sure your PostgreSQL databases/connection URL exist.
6. Run `npm run dev`.
7. Frontend: `http://localhost:5173` — Backend health: `http://localhost:5000/api/health`.

## Validation

- `npm run check` — frontend audit + backend static/contract/schema checks + frontend lint/build.
- `npm run db:check` — verifies the configured PostgreSQL connections and table availability; requires your local `.env`.

## Isolated local PostgreSQL

The backend can use the ConMat-only PostgreSQL 18 cluster stored in the ignored
`.local-postgres/` directory. It listens on `127.0.0.1:5433` and contains the
`conmat_users`, `conmat_products`, `conmat_orders`, `conmat_payments`, and
`conmat_bids` databases.

- `npm run db:local:start --workspace backend` starts the local cluster.
- `npm run db:local:status --workspace backend` checks its status.
- `npm run db:local:stop --workspace backend` stops it safely.

Backend start, development, and database-check commands start this cluster only
when no hosted database URL is active in `backend/.env`.

## Stripe

Payment testing requires matching Stripe test-mode keys in `frontend/.env` (`VITE_STRIPE_PUBLISHABLE_KEY`) and `backend/.env` (`STRIPE_SECRET_KEY`). The backend only marks an order paid after retrieving a successful Stripe PaymentIntent.

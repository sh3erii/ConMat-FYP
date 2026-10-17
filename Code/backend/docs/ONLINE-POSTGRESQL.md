# Move ConMat from localhost to hosted PostgreSQL

The backend is provider-neutral. Neon, Supabase, Railway, Render PostgreSQL, AWS RDS, Azure PostgreSQL, or another PostgreSQL host can be used.

## Recommended presentation setup: one hosted database

Use one hosted database for the FYP demo unless the team specifically needs physically separate service databases. Set:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
DB_SSL=true
AUTO_SYNC=true
DB_SYNC_ALTER=false
```

All five Sequelize service connections will use this same database while retaining separate model modules. This is simpler to deploy, back up, demo, and troubleshoot.

## Separate database option

Instead of `DATABASE_URL`, set:

```env
USERS_DB_URL=
PRODUCTS_DB_URL=
ORDERS_DB_URL=
PAYMENTS_DB_URL=
BIDS_DB_URL=
DB_SSL=true
```

## First deployment

1. Create the hosted PostgreSQL database(s).
2. Copy `.env.example` to `.env` and provide the connection URL(s) and a strong `JWT_SECRET`.
3. Install dependencies with `npm install`.
4. Run `npm run check:all`.
5. Run `npm run db:check` to verify connectivity.
6. Start once with `AUTO_SYNC=true` so missing tables are created.
7. For a stable presentation database, change `AUTO_SYNC=false` after the schema exists.

## Moving existing localhost data

Do not copy the `.env` file into the ZIP or repository. Export with PostgreSQL's `pg_dump` on the development machine and restore with `pg_restore`/`psql` against the hosted URL. Because the original project can use five localhost databases, export each corresponding database separately if they contain distinct data.

For a clean FYP presentation, migrating only the useful test/demo records is often safer than moving every historical development row. Before migration, remove duplicate test users, invalid products, failed experimental orders, and placeholder uploads.

## Production safety

- `DB_SYNC_ALTER=false` should remain the normal setting.
- Configure real Stripe keys; no local payment-success fallback is included.
- Use HTTPS for frontend and backend.
- Store Stripe, SMTP, JWT, and database secrets in the hosting provider's environment-variable settings, never in source files.
- If uploaded images must survive redeployments, move uploads to persistent storage/object storage rather than an ephemeral server folder.

# Rehman Final Backend Run Guide

This guide is for Auth, Product, Inventory, Order and Checkout backend modules.

## Install

```bash
cd backend
npm install
```

## Configure Environment

Copy `env.final.example` content into your real `.env` file.

Do not commit `.env`.

## Database

Use PostgreSQL. Create required databases:

```sql
CREATE DATABASE conmat_users_db;
CREATE DATABASE conmat_products_db;
CREATE DATABASE conmat_orders_db;
CREATE DATABASE conmat_payments_db;
CREATE DATABASE conmat_bids_db;
```

## Run Database Check

```bash
node scripts/finalDatabaseCheck.js
```

## Run Server

```bash
npm run dev
```

## Final Endpoints

```txt
GET /api/final-readiness/health
GET /api/final-readiness/modules
GET /api/final-readiness/database-plan
```

## Final Notes

- Keep PostgreSQL, not MySQL.
- Do not include `node_modules` in final zip.
- Do not include real `.env` in final zip.
- Keep controllers/services/routes modular.

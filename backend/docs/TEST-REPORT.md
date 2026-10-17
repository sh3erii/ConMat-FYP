# Integration Test Notes

Static source, frontend contract and Sequelize model-schema checks are available through `npm run check:all`.

The integrated frontend has no demo-data fallback. Authentication, product management, marketplace browsing, checkout/orders, invoices, bidding, notifications, profile/admin data and payment confirmation are API-driven.

A full database and Stripe transaction test depends on the local `.env` values supplied by the developer. Use `npm run db:check` after PostgreSQL is running and the database settings are configured.

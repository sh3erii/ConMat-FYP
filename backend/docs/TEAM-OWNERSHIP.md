# Backend ownership after integration

The deployed application should run as **one API host** because the frontend has one `VITE_API_URL`. Splitting the final project into two independent HTTP servers only to reflect team members would add unnecessary integration complexity.

For presentation/viva ownership, use this logical division:

## Abdul-Rehman

- Express host and shared middleware
- Authentication and JWT/RBAC
- User/profile/security logs
- Product management and uploads
- Marketplace filtering/pricing
- Checkout, orders, inventory reservation/restoration
- Order tracking
- Supplier inventory/analytics
- PostgreSQL connection configuration

## Nosherwan

- Bulk request and bidding logic
- Bid-to-order conversion
- Stripe payment intent, client confirmation verification and webhook handling
- Invoices
- Notifications and notification preferences
- Admin verification/management/reporting/analytics
- Email notification integration

The separate `backend-nosherwan` handoff ZIP is an ownership/source chunk. The canonical runnable host is `backend-abdulrehman` in this handoff, which imports the integrated Nosherwan features so the frontend only needs one API URL.

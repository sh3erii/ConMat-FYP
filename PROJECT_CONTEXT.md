# ConMat – Project Context File
# (Muhammad Nosherwan – 076926)
# Keep this file in the repo root. Paste its contents into any new Claude
# session to restore full project context instantly.

## Project
Construction Material Wholesale & Retail Marketplace Platform
Govt. Islamia Graduate College, Gujranwala – BSIT Session 2022-2026
Supervisor: Prof. Usman Ahmed

## Team
| Roll No | Name               | Branch             | Responsibility              |
|---------|--------------------|--------------------|---------------------------  |
| 077019  | Talha Tariq        | frontend/talha     | Frontend only               |
| 077011  | Hafiz Abdul Rehman | backend/rehman     | Auth, Product, Order modules|
| 076926  | Muhammad Nosherwan | backend/nosherwan  | Payment, Bidding, Admin, Notifications |

## Repo
https://github.com/sh3erii/ConMat-FYP

## Tech Stack
- Frontend:  React.js 18, Bootstrap, Axios, Context API
- Backend:   Node.js 20, Express.js 4, Sequelize 6 (ORM for PostgreSQL)
- Database:  PostgreSQL 15 – FIVE separate databases:
    users_db, products_db, orders_db, payments_db, bids_db
- Auth:      JWT (jsonwebtoken v9) + Bcrypt.js
- Payment:   Stripe v18.5
- Email:     Nodemailer v6 (Gmail SMTP App Password)
- Files:     Multer v2
- PDF:       (to be added – pdfkit or similar)

## Database Architecture
PostgreSQL is used because the marketplace requires separate databases per
service domain (viva conductor specified this). Sequelize is configured with
one instance per database in /backend/config/:
  db.users.js     → users_db
  db.products.js  → products_db
  db.orders.js    → orders_db
  db.payments.js  → payments_db
  db.bids.js      → bids_db

Cross-DB references are stored as UUID strings (no Sequelize FK constraints
across databases).

## Folder Structure
/backend
  server.js
  .env                          (never commit)
  package.json
  /config
    db.users.js
    db.products.js
    db.orders.js
    db.payments.js
    db.bids.js
  /models
    User.js         (Hafiz)
    Product.js      (Hafiz – Day 2)
    Order.js        (Nosherwan)
    Payment.js      (Nosherwan)
    Bid.js          (Nosherwan)
    Invoice.js      (Nosherwan – Day 2)
  /controllers
    authController.js      (Hafiz)
    productController.js   (Hafiz – Day 2)
    orderController.js     (Hafiz – Day 2)
    paymentController.js   (Nosherwan – Day 2)
    bidController.js       (Nosherwan – Day 2)
    adminController.js     (Nosherwan – Day 2)
  /routes
    authRoutes.js
    productRoutes.js  (Day 2)
    orderRoutes.js    (Day 2)
    paymentRoutes.js  (Day 2)
    bidRoutes.js      (Day 2)
    adminRoutes.js    (Day 2)
  /middleware
    authMiddleware.js     (Hafiz)
    roleMiddleware.js     (Hafiz)
    uploadMiddleware.js   (Hafiz)
  /services
    stripeService.js      (Nosherwan)
    emailService.js       (Nosherwan)
    invoiceService.js     (Nosherwan – Day 2)
  /uploads                (Multer saves files here)
  /postman
    ConMat.postman_collection.json

/frontend
  /src
    /pages
      LandingPage.jsx     (Talha)
      LoginPage.jsx       (Talha – Day 2)
      RegisterPage.jsx    (Talha – Day 2)
      MarketplacePage.jsx (Talha – Day 2)
      CustomerDashboard.jsx (Talha – Day 2)
    /components
    /services
      api.js              (Axios instance)
    /context
      AuthContext.jsx

## User Roles
Admin | Supplier | Wholesaler | Retailer | Customer

## Key Design Notes
- Suppliers are status=Pending after registration; Admin must approve
- JWT token stored in localStorage on frontend; sent as Bearer token in headers
- Axios interceptor handles 401 → redirect to login ("Session expired")
- Stripe Stripe CLI used for local webhook testing
- Email uses Gmail App Password (NOT the real Gmail password)

## UI Theme (ConMat)
- Dark navy/charcoal left panel
- White/light right content panel
- Accent: burnt orange (#B45309 approx / Tailwind orange-700)
- Bold sans-serif headings
- 5 screens: Landing, Registration (2-step), Login, Customer Dashboard, Marketplace

## Git Rules
- Never push to main directly
- Always: branch → commit → PR → merge
- Commit prefix: feat/ fix/ style/ db/ api/ docs/
- Daily WhatsApp sync

# Frontend ↔ Backend contract

This API host is aligned to the integrated ConMat React frontend. The static route contract is checked with:

```bash
npm run contract:check
```

## Authentication and account

Registration uses email OTP verification. `POST /api/auth/register` validates and stores a pending registration and sends a six-digit code. The user record is created only by `POST /api/auth/register/verify-otp`; `POST /api/auth/register/resend-otp` rotates the code after the 60-second resend lock.

- `POST /api/auth/register/verify-otp`
- `POST /api/auth/register/resend-otp`

- `POST /api/auth/register` — multipart registration (`name`, `email`, `phone`, `street`, `city`, `postalCode`, `password`, `role`, and required `idCardPhoto`; business roles also send `companyName`, live-selfie `userPhoto`, latitude/longitude, and at least one of `ntnPhoto` or `businessApprovalLetter`).
- `POST /api/auth/login`
- `GET /api/profile/me`
- `PUT /api/profile/me` — multipart profile update; an optional `profilePhoto` is stored separately from the registration selfie.
- `PUT /api/profile/change-password`
- `GET /api/profile/recent-activities?limit=5&offset=0` — paginated account, product, order, and bidding activity.
- `GET /api/profile/security-logs` — retained for compatibility with older clients.
- `GET /api/users/:sellerId` — intentionally public seller marketplace profile; sensitive identity documents are excluded.

## Product and marketplace

- `GET /api/products`
- `GET /api/products/mine`
- `POST /api/products/:id/report`
- `POST /api/products/:id/review-request` — a seller submits an adjusted hidden/rejected listing and note for admin review.
- `POST /api/products`
- `PUT /api/products/:id`
- `PATCH /api/products/:id/stock`
- `DELETE /api/products/:id`
- `GET /api/pricing/products/compare`
- `POST /api/pricing/calculate`

New products from an **Active + Approved business account with a configured seller payout method** become visible immediately; product-level admin approval is not required. Listings remain in the seller's management view but are excluded from the public marketplace until payout setup is complete. A zero-stock listing starts as `OutOfStock`. `Pending` is reserved for a seller requesting another review after an admin hide/rejection.

All Supplier, Wholesaler, and Retailer registrations remain pending until an admin approves the business account. Product reports notify active admins, must be reviewed before deletion, and deletion generates a notification for the product uploader.

When an admin hides or rejects a product, an admin note is compulsory and is sent to the seller. The seller may edit the listing and submit it with a review note, which moves it to `Pending` and notifies active admins. Admin approval makes the listing active again and notifies the seller. Admins cannot edit seller stock or place marketplace orders; their marketplace access is browse-only.

Admin user-management transitions keep business `status` and `verificationStatus` aligned: Active/Approved, Pending/Pending, and Rejected/Rejected. Pending and Rejected changes require a reason and notify the affected user. A customer product report notifies both admins and its seller. When an admin hides the reported listing, it moves from Reported to Hidden and then exposes only Unhide and Request Info from Seller; unhide reviews the pending report so the listing does not return to Reported. Seller review requests remain hidden until an admin unhides them.

Product pricing is determined by the uploader's role and recalculated by the API during checkout:

- Retailer listings have one retail price and no quantity-based price tier.
- Wholesaler listings have retail and wholesale prices; the wholesale price applies only at or above `minWholesaleQty`.
- Supplier listings have one price and require at least `minWholesaleQty` (shown as minimum order quantity).

## Checkout, orders, payment and invoice

- `POST /api/checkout/orders`
- `GET /api/checkout/orders/my`
- `GET /api/checkout/orders/:orderId`
- `PATCH /api/checkout/orders/:orderId/cancel`
- `POST /api/checkout/orders/:orderId/confirm-delivery`
- `POST /api/checkout/orders/:orderId/report-issue`
- `GET /api/orders/incoming`
- `PATCH /api/orders/:orderId/status`
- `GET /api/orders/:orderId/payment-summary`
- `GET /api/order-tracking/:orderIdOrNumber`
- `POST /api/stripe-payments/create-intent`
- `POST /api/stripe-payments/confirm-intent`
- `GET /api/stripe-payments/connect/status`
- `POST /api/stripe-payments/connect/onboarding-link`
- `POST /api/stripe-payments/connect/dashboard-link`
- `GET /api/payout-methods`
- `POST /api/payout-methods`
- `PATCH /api/payout-methods/:methodId/default`
- `DELETE /api/payout-methods/:methodId`
- `GET /api/invoices`
- `GET /api/invoices/:identifier`

Checkout totals are recalculated from live product data; browser-provided totals and prices are not trusted. The frontend supplies a stable `checkoutToken`; repeat submissions by the same buyer return the original order instead of creating another order or reserving stock twice. Stock is reserved when a checkout order is created and restored once if an unpaid order is cancelled. Estimated delivery is `3–6 hours` only when the buyer and every seller on the order are in the same city; otherwise it is `2–3 days`. Sellers add JazzCash, Easypaisa, NayaPay, UBL, or Meezan Bank in Settings, and the default method is snapshotted into each paid seller ledger. Buyer charges remain held by the marketplace until receipt confirmation. ConMat then releases each seller's order share after deducting a 1% commission. If no confirmation or WhatsApp support pause exists 24 hours after a paid order is marked delivered, the worker atomically claims and automatically releases it. Recording the WhatsApp pause sends no delivery-report alert/email and still permits later manual buyer confirmation. Demo mode records simulated disbursements; live mode requires a real provider adapter and fails closed without one.

## Transaction reports

- `GET /api/reports/options` — returns the authenticated role's allowed report types.
- `GET /api/reports/me` — Customer buying, Retailer/Supplier selling, Wholesaler buying/selling/combined, or Admin platform activity.
- `GET /api/reports/platform` — Admin-only platform transaction report.

Reports support all-time, today, specific-day, specific-month, and custom date/time ranges, plus order-status and payment-status filters. Day and month boundaries use Pakistan Standard Time. Buying values use the complete buyer order total; selling values use only the authenticated seller's order items. Recorded payout commission and net amounts come from seller payout ledger records. PDF generation and print rendering happen in the authenticated frontend report view.

## Bulk requests and bidding

- `POST /api/bids/requests`
- `GET /api/bids/my-requests`
- `GET /api/bids/requests/open`
- `GET /api/bids/offers/mine`
- `POST /api/bids/offers`
- `GET /api/bids/requests/:requestId/offers`
- `PATCH /api/bids/offers/:offerId/accept`
- `POST /api/bid-conversion/offers/:offerId/convert-to-order`
- `GET /api/bid-conversion/requests/:requestId/decision-matrix`

The frontend labels `bidAmount` as a **unit price**. Conversion therefore calculates `subtotal = bidAmount × requiredQuantity`. The current React comparison screen calls convert-to-order directly, so the conversion endpoint also performs the acceptance step safely when required.

## Notifications and settings

- `GET /api/notifications`
- `PATCH /api/notifications/:id/read`
- `GET /api/notification-preferences/me`
- `PUT /api/notification-preferences/me`

## Admin

The API includes dashboard, seller verification, user management, product moderation, order management, analytics, low-stock, and reporting routes used by the updated admin frontend. See `tests/frontend-contract.json` for the full exact list.

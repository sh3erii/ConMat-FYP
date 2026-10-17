# Database schema aligned to the updated frontend

ConMat keeps the original five logical PostgreSQL domains while using one Express API host. They can point to one hosted PostgreSQL database (`DATABASE_URL`) or five separate URLs.

## Users domain

### `users`
`id`, `name`, `email`, `phone`, `passwordHash`, `role`, `status`, `verificationStatus`, `companyName`, `cnic`, `street`, `city`, `postalCode`, `latitude`, `longitude`, `profilePhoto`, `userPhoto`, `idCardPhoto`, `ntnPhoto`, `businessApprovalLetter`, `verificationNote`, `materialFocus`, `stripeConnectedAccountId`, `stripeDetailsSubmitted`, `stripePayoutsEnabled`, `stripeTransfersStatus`, `stripePayoutCountry`, timestamps.

### `security_logs`
`id`, `userId`, `action`, `ip`, `device`, `location`, timestamps.

### `password_reset_otps`
`id`, `email` (unique), `otpHash`, `otpExpiresAt`, `resendAvailableAt`, `attempts`, timestamps. Reset codes are stored only as hashes and removed after a successful password change.

### `notification_preferences`
`id`, `userId` (UUID, unique), `orderUpdates`, `bidUpdates`, `paymentInvoices`, `adminAlerts`, `emailEnabled`, timestamps.

## Products domain

### `product_reports`
`id`, `productId`, `reporterId`, `reason`, `details`, `status`, `adminNote`, `reviewedBy`, `reviewedAt`, timestamps.

### `products`
`id`, `sellerId`, `name`, `category`, `brand`, `unit`, `retailPrice`, `wholesalePrice`, `minWholesaleQty`, `deliveryCharge`, `freeDeliveryMinQuantity`, `stock`, `city`, `description`, `imageUrl`, `status`, `verificationNote`, `reviewRequestNote`, `reviewRequestedAt`, `isFeatured`, timestamps. Retailer listings duplicate the retail price into the legacy wholesale column; Supplier listings duplicate their single price into both legacy price columns and use `minWholesaleQty` as their minimum order quantity; Wholesaler listings use all three pricing fields as retail price, wholesale price, and wholesale minimum. A zero delivery charge means free delivery for every order; otherwise `freeDeliveryMinQuantity` can make qualifying quantities free. A hidden or rejected listing can be adjusted by its seller and moved back to `Pending` with a review note for admin moderation.

The moderation/availability states are `Draft`, `Pending`, `Active`, `Hidden`, `OutOfStock`, `Rejected`. New listings start as `Active`/`OutOfStock` without product approval. The admin frontend translates active availability to `Visible`; an admin-hidden reported listing and any later seller resubmission remain `Hidden` until an admin unhides it. Legacy `Pending` rows are also presented as hidden.

## Orders domain

### `orders`
`id`, `orderNumber`, `checkoutToken`, `buyerId`, `buyerRole`, `buyerName`, `city`, `subtotal`, `shippingFee`, `taxAmount`, `discount`, `totalAmount`, `status`, `orderStatus`, `paymentStatus`, `paymentId`, `paymentMethod`, `shippingAddress`, `contactPhone`, `deliveryWindow`, `notes`, `sourceBidOfferId`, `inventoryReserved`, `stockRestoredAt`, `deliveredAt`, `deliveryResponseDeadline`, `deliveryResolution`, `cancelledAt`, timestamps. `checkoutToken` is unique and makes repeat submissions of the same browser checkout return the original order instead of creating a duplicate.

### `order_items`
`id`, `orderId`, `productId`, `sellerId`, `productName`, `category`, `unit`, `quantity`, `pricingType`, `unitPrice`, `lineTotal`, `productSnapshot`, timestamps.

### `order_status_events`
`id`, `orderId`, `status`, `description`, `location`, `updatedBy`, `visibleToBuyer`, timestamps.

## Payments domain

### `payments`
`id`, `orderId`, `buyerId`, `amount`, `currency`, `method`, `status`, `stripePaymentIntentId`, `stripeChargeId`, `transactionId`, `fundsStatus`, `paidAt`, timestamps.

### `seller_payouts`
`id`, `orderId`, `paymentId`, `sellerId`, legacy Stripe references, `payoutMethodId`, `payoutProvider`, `payoutDestination`, `processor`, `processorReference`, `releaseReason`, `currency`, `grossAmount`, `commissionRate`, `commissionAmount`, `netAmount`, `status`, `failureMessage`, `releaseAttemptedAt`, `releasedAt`, timestamps. One row exists per seller per order. ConMat retains a 1% commission and releases the net amount on buyer confirmation or automatically after the 24-hour delivery response deadline.

### `seller_payment_methods`
`id`, `sellerId`, `provider`, `accountTitle`, `accountIdentifierEncrypted`, `accountIdentifierLast4`, `isDefault`, `active`, timestamps. Providers are JazzCash, Easypaisa, NayaPay, UBL, and Meezan Bank. Full identifiers are encrypted; API responses contain masked details only.

### `invoices`
`id`, `invoiceNumber`, `orderId`, `buyerId`, `paymentId`, `subtotal`, `deliveryFee`, `tax`, `discount`, `total`, `status`, `issuedAt`, `paidAt`, timestamps.

### `notifications`
`id`, `userId`, `title`, `message`, `type`, `isRead`, `readAt`, `actionUrl`, `metadata`, timestamps.

## Bids domain

### `bid_requests`
`id`, `requestedById`, `requesterRole`, `productId`, `title`, `category`, `city`, `requiredQuantity`, `unit`, `targetPrice`, `deliveryAddress`, `notes`, `requestStatus`, `acceptedOfferId`, `expiresAt`, timestamps.

### `bid_offers`
`id`, `bidRequestId`, `supplierId`, `bidAmount` (unit price), `deliveryDays`, `notes`, `status`, timestamps.

## Verification

Run:

```bash
npm run schema:check
```

This validates that all integration-required fields are present in the Sequelize model definitions. `npm run db:check` additionally authenticates the configured live/local PostgreSQL connections.

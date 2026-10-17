# Shared dependencies used by Nosherwan features

The integrated controllers depend on shared modules that live in the canonical API host:

- `models/User.js`
- `models/Product.js`
- `models/Order.js`
- `models/OrderItem.js`
- `models/OrderStatusEvent.js`
- `services/orderService.js`
- `middleware/authMiddleware.js`
- `middleware/roleMiddleware.js`
- `config/database.js`

This is deliberate. The backend should be deployed as one application while the team explains feature ownership by module.

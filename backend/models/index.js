module.exports = {
  User: require('./User'),
  SecurityLog: require('./SecurityLog'),
  PendingRegistration: require('./PendingRegistration'),
  PasswordResetOtp: require('./PasswordResetOtp'),
  Product: require('./Product'),
  ProductReport: require('./ProductReport'),
  Order: require('./Order'),
  OrderItem: require('./OrderItem'),
  OrderStatusEvent: require('./OrderStatusEvent'),
  Payment: require('./Payment'),
  SellerPayout: require('./SellerPayout'),
  SellerPaymentMethod: require('./SellerPaymentMethod'),
  Invoice: require('./Invoice'),
  ...require('./Bid'),
  Notification: require('./Notification'),
  NotificationPreference: require('./NotificationPreference')
};

const {
  PROVIDERS,
  assertPayoutSeller,
  listSellerPaymentMethods,
  createSellerPaymentMethod,
  setDefaultSellerPaymentMethod,
  removeSellerPaymentMethod,
} = require('../services/payoutMethodService');
const { emitMarketplaceUpdate } = require('../services/socketService');

exports.list = async (req, res, next) => {
  try {
    assertPayoutSeller(req.user);
    const methods = await listSellerPaymentMethods(req.user.id);
    res.json({ success: true, data: { providers: Object.keys(PROVIDERS), methods } });
  } catch (error) { next(error); }
};

exports.create = async (req, res, next) => {
  try {
    const method = await createSellerPaymentMethod(req.user, req.body || {});
    emitMarketplaceUpdate({ sellerId: req.user.id, action: 'payout-method-added' });
    res.status(201).json({ success: true, message: 'Payout method added securely.', data: method });
  } catch (error) { next(error); }
};

exports.makeDefault = async (req, res, next) => {
  try {
    const method = await setDefaultSellerPaymentMethod(req.user, req.params.methodId);
    emitMarketplaceUpdate({ sellerId: req.user.id, action: 'payout-method-defaulted' });
    res.json({ success: true, message: `${method.provider} is now your default payout method.`, data: method });
  } catch (error) { next(error); }
};

exports.remove = async (req, res, next) => {
  try {
    const method = await removeSellerPaymentMethod(req.user, req.params.methodId);
    emitMarketplaceUpdate({ sellerId: req.user.id, action: 'payout-method-removed' });
    res.json({ success: true, message: `${method.provider} payout method removed.` });
  } catch (error) { next(error); }
};

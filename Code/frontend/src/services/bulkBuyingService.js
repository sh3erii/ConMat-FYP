import api from './api';

const BID_WRITE_TIMEOUT_MS = 30000;

export const createBulkOrderRequest = async (payload) => {
  const response = await api.post('/bids/requests', payload);
  return response.data;
};

export const getMyBulkRequests = async () => {
  const response = await api.get('/bids/my-requests');
  return response.data;
};

export const getOpenBulkRequests = async (params = {}) => {
  const response = await api.get('/bids/requests/open', { params });
  return response.data;
};

export const getOffersForRequest = async (requestId) => {
  const response = await api.get(`/bids/requests/${requestId}/offers`);
  return response.data;
};

export const submitBidOffer = async (payload) => {
  const response = await api.post('/bids/offers', payload, { timeout: BID_WRITE_TIMEOUT_MS });
  return response.data;
};

export const getMyBidOffers = async () => {
  const response = await api.get('/bids/offers/mine');
  return response.data;
};

export const getMySellerProducts = async () => {
  const response = await api.get('/products/mine');
  return response.data;
};

export const cancelBidOffer = async (offerId) => {
  const response = await api.patch(`/bids/offers/${offerId}/cancel`);
  return response.data;
};

export const acceptBidOffer = async (offerId, payload = {}) => {
  const response = await api.patch(`/bids/offers/${offerId}/accept`, payload, { timeout: BID_WRITE_TIMEOUT_MS });
  return response.data;
};

export const convertAcceptedBidToOrder = async (offerId, payload = {}) => {
  const response = await api.post(
    `/bid-conversion/offers/${offerId}/convert-to-order`,
    payload,
    { timeout: BID_WRITE_TIMEOUT_MS }
  );
  return response.data;
};

export const getBidDecisionMatrix = async (requestId) => {
  const response = await api.get(`/bid-conversion/requests/${requestId}/decision-matrix`);
  return response.data;
};

export const compareProductPrices = async ({ category, city, quantity, productIds }) => {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (city) params.append('city', city);
  if (quantity) params.append('quantity', quantity);
  if (productIds?.length) params.append('productIds', productIds.join(','));
  const response = await api.get(`/pricing/products/compare?${params.toString()}`);
  return response.data;
};

export const calculateProductPrice = async (payload) => {
  const response = await api.post('/pricing/calculate', payload);
  return response.data;
};

import { normalizeCity } from '../config/pakistanCities';

export const estimateDeliveryWindow = (buyerCity, sellerCities = []) => {
  const buyer = normalizeCity(buyerCity);
  const sellers = sellerCities.map(normalizeCity);
  return buyer && sellers.length && sellers.every((sellerCity) => sellerCity && sellerCity === buyer)
    ? '3–6 hours'
    : '2–3 days';
};

import { API_SERVER_URL } from '../config/apiConfig';
export default function getApiAssetUrl(url) {
  if (!url) return '';

  const value = String(url).trim();
  if (!value) return '';

  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  if (
    value.startsWith('/assets/') ||
    value.startsWith('/src/') ||
    value.startsWith('assets/')
  ) {
    return value;
  }

  if (value.startsWith('/uploads/') || value.startsWith('uploads/')) {
    return `${API_SERVER_URL}/${value.replace(/^\/+/, '')}`;
  }

  return value;
}

const PREFIX = '+92';

/**
 * Formats a raw phone input into +92XXXXXXXXXX.
 * - Always keeps the +92 prefix
 * - Accepts only digits after the prefix
 * - Caps the local part at 10 digits
 */
export const formatPhone = (value) => {
  // Strip everything except digits
  const raw = String(value ?? '').replace(/\D/g, '');

  // If the stored value starts with 92 (from prefix), strip it
  const digits = raw.startsWith('92') ? raw.slice(2) : raw;

  // Cap at 10 local digits
  const local = digits.slice(0, 10);

  return `${PREFIX}${local}`;
};

/**
 * Returns true when the phone value contains a full +92 + 10 local digits.
 */
export const isPhoneComplete = (value) => {
  const raw = String(value ?? '').replace(/\D/g, '');
  // Should be 92 + 10 digits = 12 total
  return raw.length === 12 && raw.startsWith('92');
};

export default formatPhone;

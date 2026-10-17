export const PAKISTAN_MAJOR_CITIES = Object.freeze([
  'Abbottabad',
  'Bahawalnagar',
  'Bahawalpur',
  'Bannu',
  'Chakwal',
  'Chiniot',
  'Dera Ghazi Khan',
  'Dera Ismail Khan',
  'Faisalabad',
  'Gilgit',
  'Gujranwala',
  'Gujrat',
  'Gwadar',
  'Hafizabad',
  'Hyderabad',
  'Islamabad',
  'Jacobabad',
  'Jhang',
  'Jhelum',
  'Karachi',
  'Kasur',
  'Khairpur',
  'Kohat',
  'Lahore',
  'Larkana',
  'Mardan',
  'Mingora',
  'Mirpur',
  'Multan',
  'Muzaffarabad',
  'Nawabshah',
  'Okara',
  'Peshawar',
  'Quetta',
  'Rahim Yar Khan',
  'Rawalpindi',
  'Sahiwal',
  'Sargodha',
  'Sheikhupura',
  'Sialkot',
  'Sukkur',
  'Wah Cantt',
]);

export const normalizeCity = (value) => String(value || '')
  .trim()
  .replace(/\s+/g, ' ')
  .toLowerCase();

export const canonicalizePakistanCity = (value) => {
  const cleaned = String(value || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  return PAKISTAN_MAJOR_CITIES.find((city) => normalizeCity(city) === normalizeCity(cleaned)) || cleaned;
};

export const cityOptionsWithCurrent = (currentCity) => {
  const current = canonicalizePakistanCity(currentCity);
  if (!current || PAKISTAN_MAJOR_CITIES.some((city) => normalizeCity(city) === normalizeCity(current))) {
    return PAKISTAN_MAJOR_CITIES;
  }

  return Object.freeze([current, ...PAKISTAN_MAJOR_CITIES]);
};

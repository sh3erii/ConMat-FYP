function browserName(userAgent = '') {
  if (/Edg\//i.test(userAgent)) return 'Microsoft Edge';
  if (/OPR\//i.test(userAgent)) return 'Opera';
  if (/CriOS\//i.test(userAgent)) return 'Chrome';
  if (/Chrome\//i.test(userAgent)) return 'Chrome';
  if (/FxiOS\//i.test(userAgent)) return 'Firefox';
  if (/Firefox\//i.test(userAgent)) return 'Firefox';
  if (/Safari\//i.test(userAgent) && /Version\//i.test(userAgent)) return 'Safari';
  return 'Web browser';
}

function operatingSystem(userAgent = '') {
  if (/Windows NT/i.test(userAgent)) return 'Windows';
  if (/Android/i.test(userAgent)) return 'Android';
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS';
  if (/Mac OS X/i.test(userAgent)) return 'macOS';
  if (/Linux/i.test(userAgent)) return 'Linux';
  return '';
}

function deviceType(userAgent = '') {
  if (/iPad|Tablet/i.test(userAgent)) return 'Tablet';
  if (/Mobile|Android|iPhone|iPod/i.test(userAgent)) return 'Mobile';
  return 'Desktop';
}

function describeDevice(userAgent) {
  if (!userAgent) return 'Unknown device';
  const browser = browserName(userAgent);
  const os = operatingSystem(userAgent);
  const type = deviceType(userAgent);
  return [browser, os ? `on ${os}` : null, `(${type})`].filter(Boolean).join(' ');
}

function displayIp(ip) {
  if (!ip) return 'Unknown IP';
  const normalized = String(ip).replace(/^::ffff:/, '');
  return normalized === '::1' || normalized === '127.0.0.1' ? 'Local network' : normalized;
}

function displayDate(value) {
  if (!value) return '';
  return new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Karachi'
  }).format(new Date(value));
}

function formatSecurityLog(log, fallbackLocation = 'Pakistan') {
  const row = log.toJSON ? log.toJSON() : { ...log };
  return {
    id: row.id,
    title: row.action,
    action: row.action,
    device: describeDevice(row.device),
    ip: displayIp(row.ip),
    location: row.location || fallbackLocation,
    createdAt: displayDate(row.createdAt),
    status: 'Safe'
  };
}

module.exports = { describeDevice, displayIp, displayDate, formatSecurityLog };

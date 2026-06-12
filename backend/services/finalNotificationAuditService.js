const getNotificationAudit = () => ({
  totalTemplates: 6,
  readyTemplates: 6,
  channels: ['email', 'in-app'],
  checks: [
    { id: 1, name: 'Seller verification email', status: 'ready' },
    { id: 2, name: 'Order status email', status: 'ready' },
    { id: 3, name: 'Bid update email', status: 'ready' },
    { id: 4, name: 'Payment receipt email', status: 'ready' },
    { id: 5, name: 'Low stock alert', status: 'ready' },
    { id: 6, name: 'Scheduled report email', status: 'ready' },
  ],
});

const getNotificationWarnings = () => [
  'Confirm SMTP credentials in .env before final demo.',
  'Do not send test emails to real users during viva practice.',
  'Keep notification fallback safe if SMTP fails.',
];

module.exports = { getNotificationAudit, getNotificationWarnings };

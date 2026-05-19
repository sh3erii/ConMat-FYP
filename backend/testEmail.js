const sgMail = require('@sendgrid/mail');

const key = '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';

console.log('Key starts with SG.:', key.startsWith('SG.'));
console.log('Key length:', key.length);

sgMail.setApiKey(key);

sgMail.send({
  to: 'nosherwaannn@gmail.com',
  from: 'it.nosherwan@gmail.com',
  subject: 'ConMat Test',
  html: '<h1>Works!</h1>'
}).then(() => console.log('✅ Sent!'))
  .catch(err => console.error('❌', err.response?.body?.errors || err.message));
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'schema-contract.json'), 'utf8'));
const missing = [];

for (const [file, fields] of Object.entries(contract)) {
  const filePath = path.join(root, 'models', file);
  if (!fs.existsSync(filePath)) {
    missing.push(`${file}: file missing`);
    continue;
  }
  const text = fs.readFileSync(filePath, 'utf8');
  for (const field of fields) {
    const re = new RegExp(`\\b${field}\\s*:`);
    if (!re.test(text)) missing.push(`${file}: ${field}`);
  }
}

if (missing.length) {
  console.error('Model schema check FAILED:');
  for (const item of missing) console.error(`  - ${item}`);
  process.exit(1);
}
console.log(`Model schema check passed: ${Object.keys(contract).length} model files contain all required integration fields.`);

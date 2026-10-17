const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const serverText = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'frontend-contract.json'), 'utf8'));

const mounts = [];
const mountRe = /app\.use\(\s*['"]([^'"]+)['"]\s*,\s*require\(\s*['"]\.\/routes\/([^'"]+)['"]\s*\)\s*\)/g;
let match;
while ((match = mountRe.exec(serverText))) mounts.push({ prefix: match[1], file: match[2] });

const endpoints = new Set();
for (const mount of mounts) {
  const routePath = path.join(root, 'routes', mount.file.endsWith('.js') ? mount.file : `${mount.file}.js`);
  if (!fs.existsSync(routePath)) continue;
  const text = fs.readFileSync(routePath, 'utf8');
  const routeRe = /\b(?:r|router)\.(get|post|put|patch|delete)\(\s*['"]([^'"]*)['"]/g;
  let route;
  while ((route = routeRe.exec(text))) {
    const suffix = route[2] === '/' ? '' : route[2];
    endpoints.add(`${route[1].toUpperCase()} ${mount.prefix}${suffix}`.replace(/\/$/, ''));
  }
}

const missing = contract
  .map(([method, endpoint]) => `${method} ${endpoint}`)
  .filter((entry) => !endpoints.has(entry));

if (missing.length) {
  console.error('Frontend contract check FAILED. Missing backend routes:');
  for (const entry of missing) console.error(`  - ${entry}`);
  process.exit(1);
}

console.log(`Frontend contract check passed: ${contract.length} required API routes are present.`);

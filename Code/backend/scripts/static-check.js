const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const files = [];
function walk(dir) { for (const name of fs.readdirSync(dir)) { const p=path.join(dir,name); const s=fs.statSync(p); if(s.isDirectory()){ if(name!=='node_modules'&&name!=='uploads') walk(p); } else if(name.endsWith('.js')) files.push(p); } }
walk(root);
let failed = 0;
for (const file of files) {
  const src = fs.readFileSync(file,'utf8');
  const matches = [...src.matchAll(/require\(['"](\.\.?\/[^'"]+)['"]\)/g)];
  for (const m of matches) {
    const base = path.resolve(path.dirname(file),m[1]);
    const candidates=[base,`${base}.js`,path.join(base,'index.js')];
    if(!candidates.some(fs.existsSync)){ console.error('Missing import:',path.relative(root,file),'->',m[1]); failed++; }
  }
}
if(failed){ console.error(`Static check failed with ${failed} missing imports.`); process.exit(1); }
console.log(`Static check passed: ${files.length} JavaScript files, no missing relative imports.`);

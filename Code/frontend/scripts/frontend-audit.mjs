import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const projectRoot = process.cwd();
const srcRoot = path.join(projectRoot, 'src');

const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});

const normalize = (value) => value.split(path.sep).join('/');
const relativeToSrc = (file) => normalize(path.relative(srcRoot, file));
const allFiles = walk(srcRoot);
const jsFiles = allFiles.filter((file) => /\.(jsx?|mjs)$/.test(file));
const cssFiles = allFiles.filter((file) => file.endsWith('.css'));

const importRegex = /(?:import|export)\s+(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']/g;
const cssImportRegex = /import\s+["']([^"']+\.css)["']/g;

const resolveRelative = (fromFile, specifier) => {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = path.extname(base)
    ? [base]
    : [
        `${base}.js`,
        `${base}.jsx`,
        `${base}.mjs`,
        path.join(base, 'index.js'),
        path.join(base, 'index.jsx'),
      ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || null;
};

const edges = new Map();
const unresolvedImports = [];
const cssReferences = new Set();
const unresolvedCssImports = [];

for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const dependencies = [];

  for (const match of source.matchAll(importRegex)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;
    const resolved = resolveRelative(file, specifier);
    if (!resolved) {
      unresolvedImports.push(`${relativeToSrc(file)} -> ${specifier}`);
      continue;
    }
    dependencies.push(path.resolve(resolved));
  }

  for (const match of source.matchAll(cssImportRegex)) {
    const specifier = match[1];
    if (!specifier.startsWith('.')) continue;
    const resolved = path.resolve(path.dirname(file), specifier);
    if (fs.existsSync(resolved)) cssReferences.add(resolved);
    else unresolvedCssImports.push(`${relativeToSrc(file)} -> ${specifier}`);
  }

  edges.set(path.resolve(file), dependencies);
}

const entry = path.resolve(srcRoot, 'main.jsx');
const reachable = new Set();
const stack = [entry];
while (stack.length) {
  const current = stack.pop();
  if (reachable.has(current)) continue;
  reachable.add(current);
  for (const dependency of edges.get(current) || []) {
    if (/\.(jsx?|mjs)$/.test(dependency)) stack.push(dependency);
  }
}
const unreachableJs = jsFiles
  .map((file) => path.resolve(file))
  .filter((file) => !reachable.has(file))
  .map(relativeToSrc);

const unreferencedCss = cssFiles
  .map((file) => path.resolve(file))
  .filter((file) => !cssReferences.has(file))
  .map(relativeToSrc);

const appFile = path.join(srcRoot, 'App.jsx');
const appSource = fs.readFileSync(appFile, 'utf8');
const routePaths = [...appSource.matchAll(/<Route\s+path=["']([^"']+)["']/g)].map((match) => match[1]);
const routeCounts = new Map();
for (const route of routePaths) routeCounts.set(route, (routeCounts.get(route) || 0) + 1);
const duplicateRoutes = [...routeCounts.entries()].filter(([, count]) => count > 1).map(([route]) => route);

const matchesRoute = (reference) => {
  const clean = reference.split('?')[0].split('#')[0];
  if (!clean.startsWith('/')) return true;

  return routePaths.some((route) => {
    if (route === '*') return false;
    if (route === clean) return true;

    const routeParts = route === '/' ? [] : route.replace(/^\//, '').split('/');
    const refParts = clean === '/' ? [] : clean.replace(/^\//, '').split('/');
    if (routeParts.length !== refParts.length) return false;

    return routeParts.every((part, index) => part.startsWith(':') || part === refParts[index]);
  });
};

const internalReferencePatterns = [
  /\bto\s*=\s*["']([^"']+)["']/g,
  /\bnavigate\(\s*["']([^"']+)["']/g,
  /\bwindow\.location\.assign\(\s*["']([^"']+)["']/g,
  /\bhref\s*=\s*["']([^"']+)["']/g,
];
const brokenLiteralRoutes = [];
for (const file of jsFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const pattern of internalReferencePatterns) {
    for (const match of source.matchAll(pattern)) {
      const value = match[1];
      if (value.startsWith('/') && !matchesRoute(value)) {
        brokenLiteralRoutes.push(`${relativeToSrc(file)} -> ${value}`);
      }
    }
  }
}

const caseMap = new Map();
for (const file of allFiles) {
  const key = normalize(path.relative(srcRoot, file)).toLowerCase();
  if (!caseMap.has(key)) caseMap.set(key, []);
  caseMap.get(key).push(relativeToSrc(file));
}
const caseConflicts = [...caseMap.values()].filter((items) => items.length > 1);

const explicitButtonsMissingType = [];
for (const file of jsFiles.filter((file) => file.endsWith('.jsx'))) {
  const source = fs.readFileSync(file, 'utf8');
  const buttonOpenings = [...source.matchAll(/<button\b([^>]*)>/g)];
  for (const match of buttonOpenings) {
    if (!/\btype\s*=/.test(match[1])) {
      const line = source.slice(0, match.index).split('\n').length;
      explicitButtonsMissingType.push(`${relativeToSrc(file)}:${line}`);
    }
  }
}

const failures = [
  ['Unresolved relative imports', unresolvedImports],
  ['Unresolved CSS imports', unresolvedCssImports],
  ['Unreachable JS/JSX modules', unreachableJs],
  ['Unreferenced CSS files', unreferencedCss],
  ['Duplicate route declarations', duplicateRoutes],
  ['Broken literal internal routes', brokenLiteralRoutes],
  ['Case-insensitive filename conflicts', caseConflicts.flatMap((items) => [items.join(' <> ')])],
  ['Buttons without explicit type', explicitButtonsMissingType],
];

console.log('ConMat frontend static audit');
console.log('---------------------------');
console.log(`JS/JSX modules: ${jsFiles.length}`);
console.log(`CSS files: ${cssFiles.length}`);
console.log(`Declared React routes: ${routePaths.length}`);

let failed = false;
for (const [label, items] of failures) {
  const ok = items.length === 0;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}: ${items.length}`);
  if (!ok) {
    failed = true;
    for (const item of items.slice(0, 20)) console.log(`      ${item}`);
    if (items.length > 20) console.log(`      ...and ${items.length - 20} more`);
  }
}

if (failed) {
  console.error('\nStatic audit failed. Fix the reported issues before packaging/deployment.');
  process.exit(1);
}

console.log('\nStatic audit passed. Run npm run lint and npm run build after installing dependencies.');

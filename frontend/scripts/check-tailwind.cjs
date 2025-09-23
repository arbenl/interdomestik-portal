const fs = require('fs');
const path = require('path');

const cssPath = path.resolve(__dirname, '../dist/assets/index.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

if (!cssContent.includes('bg-gray-50')) {
  console.error('Tailwind guard failed: bg-gray-50 not found in production CSS.');
  process.exit(1);
}

console.log('Tailwind guard passed.');

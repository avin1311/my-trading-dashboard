const fs = require('fs');
const code = fs.readFileSync('/home/z/my-project/src/lib/stock-data.ts', 'utf8');
const lines = code.split('\n');

// Find the line with INDEX_DATA
let idxLine = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const INDEX_DATA')) { idxLine = i; break; }
if (idxLine === -1) { console.error('INDEX_DATA not found'); process.exit(1); }

// The INDEX_DATA array ends at the line starting with a comment or the next section
let idxEnd = idxLine + 1;
for (let i = idxLine + 1; i < lines.length; i++) {
  const l = lines[i].trim();
  if (l === '' || (l.startsWith('//') && l !== ']')) { idxEnd = i; break; }
}

// Extract EQUITY data: lines 18 (start of array) to line before idxLine
const eqLines = lines.slice(18, idxLine);
const eqBody = eqLines.join('\n');

// Extract INDEX data: lines idxLine (start of array) to idxEnd
const idxLines = lines.slice(idxLine, idxEnd);
const idxBody = idxLines.join('\n');

// Load and combine
const eq = eval('(' + eqBody + ')');
const idx = eval('(' + idxBody + ')');

// Get option underlyings
const ouMatch = code.match(/OPTION_UNDERLYINGS:\s*\[([^\]]+)\]/);
const ou = ouMatch ? JSON.parse(ouMatch[1]) : [];

const result = {
  equities: eq.map(e => ({ s: e[0], n: e[1], sec: e[2], bp: e[3], v: e[4], ls: e[5] || 0 })),
  indices: idx.map(e => ({ s: e[0], n: e[1], bp: e[2], v: e[3], ls: e[4] })),
};

fs.writeFileSync('/home/z/my-project/src/lib/stock-list.json', JSON.stringify(result, null, 2));
console.log('OK: ' + result.equities.length + ' equities, ' + result.indices.length + ' indices, ' + ou.length + ' underlyings');
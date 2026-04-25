const fs = require('fs');
const content = fs.readFileSync('api/server.js', 'utf8');
const lines = content.split('\n');
let balance = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const open = (line.match(/\{/g) || []).length;
  const close = (line.match(/\}/g) || []).length;
  const prev = balance;
  balance += open - close;
  if (prev === 0 && balance > 0) {
     // potential start of a function/block
  }
}
console.log(`Final balance: ${balance}`);
// Let's find the last line where balance was 0
let lastZero = 0;
balance = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const open = (line.match(/\{/g) || []).length;
  const close = (line.match(/\}/g) || []).length;
  balance += open - close;
  if (balance === 0) lastZero = i + 1;
}
console.log(`Last line with balance 0: ${lastZero}`);

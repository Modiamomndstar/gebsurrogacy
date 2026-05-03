const fs = require('fs');
const content = fs.readFileSync('c:/Users/hp/Documents/geb_website_dev/gebsurrogacy/api/server.js', 'utf8');

let openBrace = 0;
let closeBrace = 0;
let openParen = 0;
let closeParen = 0;

for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') openBrace++;
    if (content[i] === '}') closeBrace++;
    if (content[i] === '(') openParen++;
    if (content[i] === ')') closeParen++;
}

console.log(`Braces: { ${openBrace}, } ${closeBrace} (Diff: ${openBrace - closeBrace})`);
console.log(`Parens: ( ${openParen}, ) ${closeParen} (Diff: ${openParen - closeParen})`);

if (openBrace !== closeBrace || openParen !== closeParen) {
    console.log("SYNTAX ERROR DETECTED: UNBALANCED CHARACTERS");
} else {
    console.log("Characters appear balanced.");
}

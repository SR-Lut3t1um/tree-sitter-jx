const { parse, print } = require("recast");
const fs = require('node:fs');

let source;

try {
  source = fs.readFileSync('./tree-sitter-java/grammar.js', 'utf8');
} catch (err) {
  exit();
}

console.log(print(parse(source)).code);



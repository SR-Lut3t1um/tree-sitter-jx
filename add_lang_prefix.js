const fs = require("fs");
const recast = require("recast");
const { namedTypes: n, visit } = require("ast-types");


function prefixGrammarFile(dir, prefix) {
  const source = fs.readFileSync(dir + "/grammar.js", "utf8");
  const ast = recast.parse(source);

  const ruleNames = new Set();


  visit(ast, {
    visitProperty(path) {
      const { node } = path;
      if (
        n.Identifier.check(node.key) &&
        node.key.name === "rules" &&
        n.ObjectExpression.check(node.value)
      ) {
        console.log("Found rules object. Processing rule keys...");
        node.value.properties.forEach((prop) => {
          if (n.Identifier.check(prop.key)) {
            // console.log(` - Found rule key: ${prop.key.name}`);
            ruleNames.add(prop.key.name);
            prop.key.name = prefix + prop.key.name;
            // console.log(`   Renamed to: ${prop.key.name}`);
          }
        });
      }
      this.traverse(path);
    },
  });


  visit(ast, {
    visitIdentifier(path) {
      if (ruleNames.has(path.node.name)) {
        // console.log(`Prefixing identifier reference: ${path.node.name}`);
        path.node.name = prefix + path.node.name;
      }
      this.traverse(path);
    },

    visitLiteral(path) {
      if (typeof path.node.value === "string" && ruleNames.has(path.node.value)) {
        // console.log(`Prefixing string literal reference: "${path.node.value}"`);
        path.node.value = prefix + path.node.value;
      }
      this.traverse(path);
    },
  });

  const output = recast.print(ast).code;
  fs.writeFileSync(dir + "/grammar_prefixed.js", output);
  console.log("✅Prefixing complete. Output saved to grammar_prefixed.js");
}

prefixGrammarFile("./tree-sitter-css", "css");
prefixGrammarFile("./tree-sitter-html", "html");

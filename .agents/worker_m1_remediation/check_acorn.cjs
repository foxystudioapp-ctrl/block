const fs = require('fs');
const acorn = require('acorn');
try {
  const code = fs.readFileSync('src/screens/matchMode.js', 'utf8');
  acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  console.log("Acorn: parsed successfully!");
} catch (err) {
  console.error("Acorn parse error:", err.message, "at position:", err.pos);
  if (err.pos) {
    const start = Math.max(0, err.pos - 50);
    const end = Math.min(code.length, err.pos + 50);
    console.error("Context:", JSON.stringify(code.substring(start, end)));
  }
}

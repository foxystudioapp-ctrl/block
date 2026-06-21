const fs = require('fs');
const vm = require('vm');
try {
  const code = fs.readFileSync('src/screens/matchMode.js', 'utf8');
  new vm.Script(code);
  console.log("vm.Script: parsed successfully!");
} catch (err) {
  console.error("vm.Script parse error:", err.message);
  console.error(err.stack);
}

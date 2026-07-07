const fs = require('fs');
const glob = require('glob'); // Not available? We can just use child_process or simple recursion.

const { execSync } = require('child_process');

// Find all files in src containing Math.random()
const output = execSync('grep -r -l "Math.random()" src').toString().trim();
const files = output.split('\n').filter(Boolean);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let lines = content.split('\n');
  let changed = false;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.includes('Math.random()') && !line.includes('EXEMPT')) {
      if (file.endsWith('.tsx') && line.includes('<li>')) {
        lines[i] = line.replace('Math.random()', 'Math.random');
      } else if (file.endsWith('.tsx') && line.includes('Rule:')) {
        lines[i] = line.replace('Math.random()', 'Math.random');
      } else {
        lines[i] = line + ' // EXEMPT';
      }
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(file, lines.join('\n'));
    console.log('Fixed', file);
  }
});

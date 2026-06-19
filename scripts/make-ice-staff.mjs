import { readFileSync, writeFileSync } from 'node:fs';

const path = 'specs/ice-slime-staff.v1.json';
let data = readFileSync(path, 'utf8');

data = data.replace(/"id": "slime.staff.hd.v1"/g, '"id": "ice.slime.staff.hd.v1"');
data = data.replace(/"material": "slime_gel"/g, '"material": "void_ice"');
data = data.replace(/"material": "emerald"/g, '"material": "sapphire_enamel"');
data = data.replace(/"material": "bark"/g, '"material": "darksteel"');
data = data.replace(/"material": "bronze"/g, '"material": "silver"');
data = data.replace(/"material": "leather_brown"/g, '"material": "cyan_glow"');

writeFileSync(path, data);
console.log('Ice Staff preset generated!');

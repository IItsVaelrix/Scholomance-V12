#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const RESONANCE_DIR = path.resolve(process.cwd(), 'public/data/resonance');

// --- ANSI Colors ---
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

class ResonanceArchive {
  constructor() {
    this.records = [];
    this.loadArchives();
  }

  loadArchives() {
    if (!fs.existsSync(RESONANCE_DIR)) {
      fs.mkdirSync(RESONANCE_DIR, { recursive: true });
      return;
    }
    const files = fs.readdirSync(RESONANCE_DIR);
    
    for (const file of files) {
      if (file.endsWith('.resonance.json')) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(RESONANCE_DIR, file), 'utf-8'));
          this.records.push({ filename: file, data });
        } catch (e) {
          console.warn(`${c.yellow}⚠️ Failed to parse ${file}${c.reset}`);
        }
      }
    }
    // Sort by timestamp (newest first) if available
    this.records.sort((a, b) => {
      const tA = new Date(a.data.timestamp || 0).getTime();
      const tB = new Date(b.data.timestamp || 0).getTime();
      return tB - tA;
    });
  }

  getChecksum(data) {
    return data.exosome_payload?.checksum || data.checksum || 'Unknown';
  }

  search(query) {
    if (!query) return this.records;
    const term = query.toLowerCase();
    return this.records.filter(r => {
      const payloadString = JSON.stringify(r.data).toLowerCase();
      return payloadString.includes(term);
    });
  }

  queryByRegion(minX, maxX, minY, maxY, minZ, maxZ) {
    return this.records.filter(r => {
      const coords = r.data.exosome_payload?.context?.topology_coord || r.data.topology_coord;
      if (!coords) return false;
      const [x, y, z] = coords;
      return x >= minX && x <= maxX && 
             y >= minY && y <= maxY && 
             z >= minZ && z <= maxZ;
    });
  }

  getByChecksum(checksum) {
    return this.records.find(r => this.getChecksum(r.data).startsWith(checksum));
  }

  clear() {
    let count = 0;
    for (const record of this.records) {
      fs.unlinkSync(path.join(RESONANCE_DIR, record.filename));
      count++;
    }
    this.records = [];
    return count;
  }
}

// --- CLI Logic ---
const options = {
  query: { type: 'string', short: 'q' },
  region: { type: 'string', short: 'r' },
  help: { type: 'boolean', short: 'h' }
};

const { values, positionals } = parseArgs({ options, allowPositionals: true });

function printHelp() {
  console.log(`
${c.cyan}${c.bold}🛡️  Scholomance Spatial Immune CLI${c.reset}
The command-line interface for the Resonance Lymph Node Archive.

${c.bold}Usage:${c.reset}
  scholo-immune <command> [arguments]

${c.bold}Commands:${c.reset}
  ${c.green}search${c.reset} [term]           Search all exosomes for a keyword (or list all if empty)
  ${c.green}region${c.reset} <x,X,y,Y,z,Z>    Find anomalies in a specific spatial bounding box
  ${c.green}read${c.reset} <checksum>       Dump the full JSON payload of a specific exosome
  ${c.green}stats${c.reset}                 View high-level metrics of the immune system
  ${c.green}clear${c.reset}                 Wipe the entire Resonance Archive (Use with caution!)

${c.bold}Examples:${c.reset}
  scholo-immune search "SINGLETON"
  scholo-immune read 2a582753
  scholo-immune region "0,10,0,10,0,10"
  `);
  process.exit(0);
}

if (values.help || positionals.length === 0) {
  printHelp();
}

const archive = new ResonanceArchive();
const command = positionals[0];

function printRecordSummary(res, index) {
  const { data, filename } = res;
  const checksum = archive.getChecksum(data);
  const epicenter = data.epicenter_node || data.generator_node || 'Unknown';
  const status = data.resolution_status || data.status || 'Unknown';
  const coords = data.exosome_payload?.context?.topology_coord?.join(', ') || data.topology_coord?.join(', ') || 'N/A';
  const time = data.timestamp || 'Unknown Time';
  
  const statusColor = status === 'RESOLVED' ? c.green : (status === 'ARCHIVED' ? c.cyan : c.red);

  console.log(`[${c.magenta}${index + 1}${c.reset}] ${c.bold}Checksum:${c.reset} ${c.yellow}${checksum}${c.reset}`);
  console.log(`    ${c.dim}File:${c.reset}      public/data/resonance/${filename}`);
  console.log(`    ${c.dim}Time:${c.reset}      ${time}`);
  console.log(`    ${c.dim}Epicenter:${c.reset} ${c.blue}${epicenter}${c.reset}`);
  console.log(`    ${c.dim}Status:${c.reset}    ${statusColor}${status}${c.reset}`);
  console.log(`    ${c.dim}Coords:${c.reset}    [${coords}]`);
  console.log(`    ${c.dim}---${c.reset}`);
}

switch (command) {
  case 'search': {
    const searchTerm = values.query || positionals[1] || '';
    if (searchTerm) {
      console.log(`\n${c.cyan}🔍 Searching Archive for: "${searchTerm}"...${c.reset}\n`);
    } else {
      console.log(`\n${c.cyan}📚 Listing all records in Archive...${c.reset}\n`);
    }
    
    const results = archive.search(searchTerm);
    if (results.length === 0) {
      console.log(`${c.red}❌ No anomalies found.${c.reset}`);
    } else {
      console.log(`${c.green}✅ Found ${results.length} records:${c.reset}\n`);
      results.forEach(printRecordSummary);
    }
    break;
  }

  case 'region': {
    const regionStr = values.region || positionals[1];
    if (!regionStr) {
      console.error(`${c.red}❌ Missing region coordinates.${c.reset}`);
      process.exit(1);
    }
    const bounds = regionStr.split(',').map(Number);
    if (bounds.length !== 6 || bounds.some(isNaN)) {
      console.error(`${c.red}❌ Invalid region format. Use minX,maxX,minY,maxY,minZ,maxZ${c.reset}`);
      process.exit(1);
    }

    console.log(`\n${c.cyan}📡 Scanning Quadrant [X: ${bounds[0]}-${bounds[1]}, Y: ${bounds[2]}-${bounds[3]}, Z: ${bounds[4]}-${bounds[5]}]...${c.reset}\n`);
    const results = archive.queryByRegion(...bounds);
    
    if (results.length === 0) {
      console.log(`${c.green}✅ Quadrant is clean. No anomalies detected.${c.reset}`);
    } else {
      console.log(`${c.red}⚠️ Found ${results.length} anomalies in this quadrant:${c.reset}\n`);
      results.forEach(printRecordSummary);
    }
    break;
  }

  case 'read': {
    const checksum = positionals[1];
    if (!checksum) {
      console.error(`${c.red}❌ Missing checksum to read.${c.reset}`);
      process.exit(1);
    }
    const record = archive.getByChecksum(checksum);
    if (!record) {
      console.error(`${c.red}❌ Record with checksum starting with "${checksum}" not found.${c.reset}`);
      process.exit(1);
    }
    console.log(`\n${c.cyan}📄 Payload for ${checksum}:${c.reset}\n`);
    console.log(JSON.stringify(record.data, null, 2));
    break;
  }

  case 'stats': {
    console.log(`\n${c.cyan}📊 Immune System Health Overview${c.reset}\n`);
    console.log(`${c.bold}Total Records:${c.reset} ${archive.records.length}`);
    
    const statusCounts = {};
    const nodeCounts = {};
    
    archive.records.forEach(r => {
      const status = r.data.resolution_status || r.data.status || 'UNKNOWN';
      const node = r.data.epicenter_node || r.data.generator_node || 'UNKNOWN';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
      nodeCounts[node] = (nodeCounts[node] || 0) + 1;
    });

    console.log(`\n${c.bold}Resolution Status:${c.reset}`);
    for (const [status, count] of Object.entries(statusCounts)) {
      console.log(`  - ${status}: ${count}`);
    }

    console.log(`\n${c.bold}Top Epicenter Nodes:${c.reset}`);
    const sortedNodes = Object.entries(nodeCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [node, count] of sortedNodes) {
      console.log(`  - ${node}: ${count} anomalies`);
    }
    console.log('');
    break;
  }

  case 'clear': {
    const count = archive.clear();
    console.log(`\n${c.green}🧹 Archive cleared. Removed ${count} records.${c.reset}\n`);
    break;
  }

  default:
    console.error(`${c.red}❌ Unknown command: ${command}${c.reset}`);
    printHelp();
}

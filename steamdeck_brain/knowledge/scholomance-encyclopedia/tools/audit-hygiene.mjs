#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const TOOL_DIR = path.dirname(__filename);
const ENCYCLOPEDIA_ROOT = path.resolve(TOOL_DIR, '..');
const REPO_ROOT = path.resolve(ENCYCLOPEDIA_ROOT, '..', '..');
const PDR_DIR = path.join(ENCYCLOPEDIA_ROOT, 'PDR-archive');
const MAIN_README = path.join(ENCYCLOPEDIA_ROOT, 'README.md');
const PDR_README = path.join(PDR_DIR, 'README.md');

const ROOT_ENTRYPOINTS = new Map([
    ['AGENTS.md', 'docs/scholomance-encyclopedia/Scholomance LAW/AGENTS.md'],
    ['ARCH_CONTRACT_OVERLAY_INTEGRITY.md', 'docs/scholomance-encyclopedia/Scholomance LAW/ARCH_CONTRACT_OVERLAY_INTEGRITY.md'],
    ['CLAUDE.md', 'docs/scholomance-encyclopedia/Scholomance LAW/CLAUDE.md'],
    ['CODEX.md', 'docs/scholomance-encyclopedia/Scholomance LAW/CODEX.md'],
    ['CURSOR.md', 'docs/scholomance-encyclopedia/Scholomance LAW/CURSOR.md'],
    ['ENGINEERING_RULEBOOK.md', 'docs/scholomance-encyclopedia/Scholomance LAW/ENGINEERING_RULEBOOK.md'],
    ['GEMINI.md', 'docs/scholomance-encyclopedia/Scholomance LAW/GEMINI.md'],
    ['SCHEMA_CONTRACT.md', 'docs/scholomance-encyclopedia/Scholomance LAW/SCHEMA_CONTRACT.md'],
    ['SHARED_PREAMBLE.md', 'docs/scholomance-encyclopedia/Scholomance LAW/SHARED_PREAMBLE.md'],
    ['UNITY.md', 'docs/scholomance-encyclopedia/Scholomance LAW/UNITY.md'],
    ['VAELRIX_LAW.md', 'docs/scholomance-encyclopedia/Scholomance LAW/VAELRIX_LAW.md'],
]);

const errors = [];
const warnings = [];

function toPosix(value) {
    return value.replace(/\\/g, '/');
}

function walkFiles(directory) {
    const entries = fs.readdirSync(directory, { withFileTypes: true });
    const files = [];

    for (const entry of entries) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...walkFiles(fullPath));
        } else {
            files.push(fullPath);
        }
    }

    return files.sort();
}

function readText(filePath) {
    return fs.readFileSync(filePath, 'utf8');
}

function relativeTo(baseDir, filePath) {
    return toPosix(path.relative(baseDir, filePath));
}

function decodeLink(rawHref) {
    const withoutAnchor = rawHref.split('#')[0];
    try {
        return decodeURIComponent(withoutAnchor);
    } catch {
        return withoutAnchor;
    }
}

function extractLocalMarkdownLinks(markdown, baseDir) {
    const links = new Set();
    const pattern = /\[[^\]]+\]\(([^)]+)\)/g;
    let match;

    while ((match = pattern.exec(markdown))) {
        const href = decodeLink(match[1].trim());
        if (!href || /^[a-z]+:/i.test(href) || href.startsWith('#')) {
            continue;
        }

        const resolved = path.resolve(baseDir, href);
        if (!resolved.startsWith(ENCYCLOPEDIA_ROOT)) {
            continue;
        }

        links.add(relativeTo(ENCYCLOPEDIA_ROOT, resolved));
    }

    return links;
}

function checkRootEntrypoints() {
    for (const [entrypoint, target] of ROOT_ENTRYPOINTS) {
        const rootPath = path.join(REPO_ROOT, entrypoint);
        const targetPath = path.join(REPO_ROOT, target);

        if (!fs.existsSync(rootPath)) {
            errors.push(`Missing root law entrypoint: ${entrypoint}`);
            continue;
        }

        if (!fs.existsSync(targetPath)) {
            errors.push(`Root entrypoint ${entrypoint} points at missing target: ${target}`);
            continue;
        }

        const text = readText(rootPath);
        if (!text.includes(target)) {
            errors.push(`Root entrypoint ${entrypoint} does not reference ${target}`);
        }
    }
}

function checkZeroByteFiles() {
    for (const filePath of walkFiles(ENCYCLOPEDIA_ROOT)) {
        if (fs.statSync(filePath).size === 0) {
            errors.push(`Zero-byte encyclopedia artifact: ${relativeTo(ENCYCLOPEDIA_ROOT, filePath)}`);
        }
    }
}

function checkPdrIndex() {
    const pdrFiles = fs.readdirSync(PDR_DIR)
        .filter((fileName) => fileName.endsWith('.md') && fileName !== 'README.md')
        .sort();
    const readme = readText(PDR_README);
    const links = extractLocalMarkdownLinks(readme, PDR_DIR);
    const linkedPdrFiles = new Set(
        Array.from(links)
            .filter((linkPath) => linkPath.startsWith('PDR-archive/'))
            .map((linkPath) => path.basename(linkPath)),
    );

    for (const fileName of pdrFiles) {
        if (!linkedPdrFiles.has(fileName)) {
            errors.push(`PDR missing from archive index: ${fileName}`);
        }
    }

    for (const fileName of linkedPdrFiles) {
        if (fileName !== 'README.md' && !pdrFiles.includes(fileName)) {
            errors.push(`PDR archive index links missing file: ${fileName}`);
        }
    }
}

function checkMainIndex() {
    const allFiles = walkFiles(ENCYCLOPEDIA_ROOT)
        .map((filePath) => relativeTo(ENCYCLOPEDIA_ROOT, filePath))
        .filter((filePath) => filePath !== 'README.md')
        .filter((filePath) => !filePath.startsWith('tools/'))
        .filter((filePath) => !filePath.startsWith('PDR-archive/') || filePath === 'PDR-archive/README.md');
    const readme = readText(MAIN_README);
    const links = extractLocalMarkdownLinks(readme, ENCYCLOPEDIA_ROOT);

    for (const filePath of allFiles) {
        if (!links.has(filePath)) {
            errors.push(`Main encyclopedia README missing link: ${filePath}`);
        }
    }

    for (const filePath of links) {
        const resolved = path.join(ENCYCLOPEDIA_ROOT, filePath);
        if (!fs.existsSync(resolved)) {
            errors.push(`Main encyclopedia README links missing file: ${filePath}`);
        }
    }
}

function checkSearchAnchors() {
    const markdownFiles = walkFiles(ENCYCLOPEDIA_ROOT)
        .filter((filePath) => filePath.endsWith('.md'))
        .filter((filePath) => !relativeTo(ENCYCLOPEDIA_ROOT, filePath).startsWith('PDR-archive/'));
    const missing = markdownFiles
        .filter((filePath) => {
            const text = readText(filePath);
            return !text.includes('SCHOL-ENC-BYKE-SEARCH') && !text.includes('SCHOL-ENC-BUG-');
        })
        .map((filePath) => relativeTo(ENCYCLOPEDIA_ROOT, filePath));

    if (missing.length > 0) {
        warnings.push(`Markdown files without search anchors: ${missing.length}`);
        for (const filePath of missing.slice(0, 20)) {
            warnings.push(`  - ${filePath}`);
        }
        if (missing.length > 20) {
            warnings.push(`  - ... ${missing.length - 20} more`);
        }
    }
}

checkRootEntrypoints();
checkZeroByteFiles();
checkPdrIndex();
checkMainIndex();
checkSearchAnchors();

console.log('Scholomance Encyclopedia Hygiene Audit');
console.log(`status: ${errors.length === 0 ? 'PASS' : 'FAIL'}`);
console.log(`errors: ${errors.length}`);
console.log(`warnings: ${warnings.length}`);

if (errors.length > 0) {
    console.log('\nErrors');
    for (const error of errors) {
        console.log(`- ${error}`);
    }
}

if (warnings.length > 0) {
    console.log('\nWarnings');
    for (const warning of warnings) {
        console.log(warning.startsWith('  - ') ? warning : `- ${warning}`);
    }
}

process.exit(errors.length === 0 ? 0 : 1);

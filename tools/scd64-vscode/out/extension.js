"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const node_1 = require("vscode-languageclient/node");
let client;
const fs = __importStar(require("fs"));
let cachedGlossary = null;
function getGlossary(context) {
    if (cachedGlossary)
        return cachedGlossary;
    try {
        const p = path.join(context.extensionPath, 'data', 'scd64-glossary.v1.json');
        cachedGlossary = JSON.parse(fs.readFileSync(p, 'utf-8'));
        return cachedGlossary;
    }
    catch (e) {
        return null;
    }
}
const SCD64_REGEX = /\b[0-9A-F]{64}\b/g;
const SCD64_SLOT_NAMES = ["BUGCLASS", "COORDSYS", "INVARIANT", "MAGNITUDE", "MASKING", "GATE", "PROPAGATE", "VERDICT"];
function decodeSCD64HoverLocal(checksum64, context) {
    const blocks = checksum64.match(/.{8}/g) || [];
    const versionByte = blocks.length > 0 && blocks[0] ? blocks[0].substring(0, 2) : "00";
    const glossary = getGlossary(context);
    let bugFamily = "UNKNOWN_FAMILY";
    if (glossary && blocks.length > 0 && blocks[0]) {
        const b0 = blocks[0];
        const firstFoundSlot = glossary.find(g => g.hexCode === b0 || (g.predictedVersionByte === versionByte && g.hexCode.endsWith(b0.slice(2))));
        if (firstFoundSlot)
            bugFamily = firstFoundSlot.family;
    }
    const slots = blocks.map((hex, i) => {
        let entry = glossary?.find(g => g.hexCode === hex && g.slotIndex === i);
        if (!entry && i === 0 && glossary) {
            entry = glossary.find(g => g.predictedVersionByte === versionByte && g.hexCode.endsWith(hex.slice(2)) && g.slotIndex === i);
        }
        return {
            name: SCD64_SLOT_NAMES[i] || `SLOT_${i}`,
            hex,
            meaning: entry ? entry.humanMeaning : "Unknown code"
        };
    });
    return {
        valid: true,
        versionByte,
        bugFamily,
        slots,
        remediationHints: bugFamily === "COLOR_DRAGON" ? [
            "Set breakpoint where TruesightPlugin computes global charStart.",
            "Compare backend source-relative charStart with frontend Lexical sibling accumulation.",
            "Do not patch shouldColor() directly until coordinate authority is verified."
        ] : []
    };
}
function activate(context) {
    // 1. Hover Provider for explicitly pasted hashes
    const hoverProvider = vscode.languages.registerHoverProvider({ scheme: '*' }, {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position, SCD64_REGEX);
            if (!range)
                return null;
            const decoded = decodeSCD64HoverLocal(document.getText(range), context);
            const mdString = new vscode.MarkdownString();
            mdString.isTrusted = true;
            const isPredicted = decoded.versionByte === "E1";
            const versionLabel = isPredicted ? "E1-PREDICTED" : `v${parseInt(decoded.versionByte, 16) || 1}`;
            mdString.appendMarkdown(`\`\`\`cli\n[${versionLabel}] ${decoded.bugFamily}\n=================================================\n`);
            for (const slot of decoded.slots)
                mdString.appendMarkdown(`${slot.name.padEnd(10)} : ${slot.meaning}\n`);
            if (decoded.remediationHints && decoded.remediationHints.length > 0) {
                mdString.appendMarkdown(`\n--- REMEDIATION HINTS ---\n`);
                for (const hint of decoded.remediationHints)
                    mdString.appendMarkdown(`> ${hint}\n`);
            }
            mdString.appendMarkdown(`\`\`\``);
            return new vscode.Hover(mdString, range);
        }
    });
    context.subscriptions.push(hoverProvider);
    // 2. Language Server for predictive AST diagnostics
    const serverModule = context.asAbsolutePath(path.join('..', 'packages', 'scd64-language-server', 'out', 'server.js'));
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
            options: { execArgv: ['--nolazy', '--inspect=6009'] }
        }
    };
    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'typescriptreact' }, { scheme: 'file', language: 'javascriptreact' }, { scheme: 'file', language: 'javascript' }, { scheme: 'file', language: 'typescript' }],
        synchronize: {
            fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    client = new node_1.LanguageClient('scd64LanguageServer', 'SCD64 Architectural Immune Server', serverOptions, clientOptions);
    client.start();
}
function deactivate() {
    if (!client)
        return undefined;
    return client.stop();
}
//# sourceMappingURL=extension.js.map
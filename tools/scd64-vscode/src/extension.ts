import * as path from 'path';
import * as vscode from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

import * as fs from 'fs';

let cachedGlossary: any[] | null = null;
function getGlossary(context: vscode.ExtensionContext) {
  if (cachedGlossary) return cachedGlossary;
  try {
    const p = path.join(context.extensionPath, 'data', 'scd64-glossary.v1.json');
    cachedGlossary = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return cachedGlossary;
  } catch (e) {
    return null;
  }
}

const SCD64_REGEX = /\b[0-9A-F]{64}\b/g;
const SCD64_SLOT_NAMES = ["BUGCLASS", "COORDSYS", "INVARIANT", "MAGNITUDE", "MASKING", "GATE", "PROPAGATE", "VERDICT"];

function decodeSCD64HoverLocal(checksum64: string, context: vscode.ExtensionContext) {
  const blocks = checksum64.match(/.{8}/g) || [];
  const versionByte = blocks.length > 0 && blocks[0] ? blocks[0].substring(0, 2) : "00";
  
  const glossary = getGlossary(context);
  let bugFamily = "UNKNOWN_FAMILY";
  
  if (glossary && blocks.length > 0 && blocks[0]) {
    const b0 = blocks[0];
    const firstFoundSlot = glossary.find(g => g.hexCode === b0 || (g.predictedVersionByte === versionByte && g.hexCode.endsWith(b0.slice(2))));
    if (firstFoundSlot) bugFamily = firstFoundSlot.family;
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

export function activate(context: vscode.ExtensionContext) {
  // 1. Hover Provider for explicitly pasted hashes
  const hoverProvider = vscode.languages.registerHoverProvider({ scheme: '*' }, {
    provideHover(document, position, token) {
      const range = document.getWordRangeAtPosition(position, SCD64_REGEX);
      if (!range) return null;
      const decoded = decodeSCD64HoverLocal(document.getText(range), context);
      const mdString = new vscode.MarkdownString();
      mdString.isTrusted = true;
      const isPredicted = decoded.versionByte === "E1";
      const versionLabel = isPredicted ? "E1-PREDICTED" : `v${parseInt(decoded.versionByte, 16) || 1}`;
      mdString.appendMarkdown(`\`\`\`cli\n[${versionLabel}] ${decoded.bugFamily}\n=================================================\n`);
      for (const slot of decoded.slots) mdString.appendMarkdown(`${slot.name.padEnd(10)} : ${slot.meaning}\n`);
      if (decoded.remediationHints && decoded.remediationHints.length > 0) {
        mdString.appendMarkdown(`\n--- REMEDIATION HINTS ---\n`);
        for (const hint of decoded.remediationHints) mdString.appendMarkdown(`> ${hint}\n`);
      }
      mdString.appendMarkdown(`\`\`\``);
      return new vscode.Hover(mdString, range);
    }
  });
  context.subscriptions.push(hoverProvider);

  // 2. Language Server for predictive AST diagnostics
  const serverModule = context.asAbsolutePath(
    path.join('..', 'packages', 'scd64-language-server', 'out', 'server.js')
  );

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: { execArgv: ['--nolazy', '--inspect=6009'] }
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'typescriptreact' }, { scheme: 'file', language: 'javascriptreact' }, { scheme: 'file', language: 'javascript' }, { scheme: 'file', language: 'typescript' }],
    synchronize: {
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
    }
  };

  client = new LanguageClient(
    'scd64LanguageServer',
    'SCD64 Architectural Immune Server',
    serverOptions,
    clientOptions
  );

  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) return undefined;
  return client.stop();
}

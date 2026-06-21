import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult
} from 'vscode-languageserver/node';

import {
  TextDocument
} from 'vscode-languageserver-textdocument';

import { Project, SyntaxKind, Node } from 'ts-morph';

// Create a connection for the server, using Node's IPC as a transport.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code hover/diagnostics
    }
  };
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
});

// Cache ts-morph projects per document
const project = new Project({ useInMemoryFileSystem: true });

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

import { RuleRegistry } from '../../../src/core/scd64/RuleRegistry';

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const text = textDocument.getText();
  const uri = textDocument.uri;

  const sourceFile = project.createSourceFile(uri, text, { overwrite: true });
  const diagnostics: Diagnostic[] = [];

  const matches = RuleRegistry.evaluateAll(sourceFile);

  for (const match of matches) {
    const start = sourceFile.getLineAndColumnAtPos(match.targetNode.getStart());
    const end = sourceFile.getLineAndColumnAtPos(match.targetNode.getEnd());
    
    const versionByte = match.predictedSCD64.slice(0, 2);
    const hoverMessage = `\`\`\`cli
⚠️ ARCHITECTURAL MUTATION PREDICTED
[${versionByte}] ${match.family} (Similarity: ${match.similarity})
=================================================
Predicted Checksum: ${match.predictedSCD64}

--- EVIDENCE ---
${match.evidence.map(e => `> ${e}`).join('\n')}

--- REMEDIATION HINTS ---
${match.remediation.map(r => `> ${r}`).join('\n')}
\`\`\``;

    const diagnostic: Diagnostic = {
      severity: match.severity === 'error' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning,
      range: {
        start: { line: start.line - 1, character: start.column - 1 },
        end: { line: end.line - 1, character: end.column - 1 }
      },
      message: `Predicted SCD64 Mutation: ${match.family} risk detected.\nHover for remediation hints.\n\n${hoverMessage}`,
      source: 'SCD64 Immune System',
      code: match.ruleId
    };
    
    diagnostics.push(diagnostic);
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();

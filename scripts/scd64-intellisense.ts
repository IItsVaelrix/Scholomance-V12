import { Project } from 'ts-morph';
import { RuleRegistry } from '../src/core/scd64/RuleRegistry';
import type { SCD64DiagnosticMatch } from '../src/core/scd64/RuleRegistry';

const args = process.argv.slice(2);
const isJson = args.includes('--json');
const failOnError = args.includes('--fail-on=error');

// Filter out flag args to get the glob/file path
const filePatterns = args.filter(a => !a.startsWith('--'));

if (filePatterns.length === 0) {
  console.error("Usage: tsx scd64-intellisense.ts [--json] [--fail-on=error] <file-patterns>");
  process.exit(1);
}

const project = new Project();
project.addSourceFilesAtPaths(filePatterns);

const allDiagnostics: any[] = [];

for (const sourceFile of project.getSourceFiles()) {
  const matches = RuleRegistry.evaluateAll(sourceFile);
  
  for (const match of matches) {
    const start = sourceFile.getLineAndColumnAtPos(match.targetNode.getStart());
    allDiagnostics.push({
      file: sourceFile.getFilePath(),
      line: start.line,
      column: start.column,
      rule: match.ruleId,
      family: match.family,
      similarity: match.similarity,
      severity: match.severity,
      evidence: match.evidence,
      remediation: match.remediation,
      predictedSCD64: match.predictedSCD64
    });
  }
}

if (isJson) {
  console.log(JSON.stringify(allDiagnostics, null, 2));
} else {
  console.log("SCD64 Predictive IntelliSense\n");
  if (allDiagnostics.length === 0) {
    console.log("✅ No architectural mutations detected.");
  } else {
    for (const d of allDiagnostics) {
      const versionByte = d.predictedSCD64.slice(0, 2);
      console.log(`${d.file}:${d.line}:${d.column}`);
      console.log(`  WARNING ${d.rule}`);
      console.log(`  Predicted family: [${versionByte}] ${d.family}`);
      console.log(`  Predicted Checksum: ${d.predictedSCD64}`);
      console.log(`  Similarity: ${d.similarity}`);
      console.log(`  Evidence: \n    > ${d.evidence.join('\n    > ')}`);
      console.log("");
    }
  }
}

const hasErrors = allDiagnostics.some(d => d.severity === 'error');
if (hasErrors && failOnError) {
  process.exit(1);
} else {
  process.exit(0);
}

import { describe, expect, it } from 'vitest';
import {
  buildCccbId,
  deriveSemanticSlug,
  extractCccbBlocks,
  fnv1a32,
  parseCccbBlock,
  parseCccbId,
  serializeCccbBlock,
  traverseCccbGraph,
  verifyCccbBlock,
} from '../../codex/core/diagnostic/cccbEncoder.js';

const BLOCK_A_ID = 'SCHOL-CCCB-v1-PDR-01-00-FNDTNDT-2405625c';
const BLOCK_B_ID = 'SCHOL-CCCB-v1-PDR-02-00-CNNCLSCH-55437683';

const BLOCK_A = Object.freeze({
  ID: BLOCK_A_ID,
  PHASE: '01:Foundation Audit',
  TITLE: 'Inventory all existing motion bytecode and animation interfaces',
  GLOSSARY: 'MOTION_BYTECODE:compiled animation state representation | CSS_TRANSLATOR:adapter converting IR to CSS vars | PIXELBRAIN_IFACE:mathematical execution primitives',
  STEPS: '1.read_pdr 2.grep_references 3.map_interfaces',
  CODE_SPEC: 'file:codex/core/ fn:getBytecodeAMP op:inventory',
  PITFALLS: 'P1:Do not confuse adapters with IR | P2:Do not skip formula interfaces | P3:Do not omit easing tokens',
  IMPLS: 'A:grep_then_read→fast symbol confirmation | B:file_by_file_read→slower complete audit | C:pdr_cross_reference→fastest documented path',
  NEXT: BLOCK_B_ID,
  MCP_KEYS: 'PDR_CCCB_PDR_01_00,PDR_CCCB_PDR_01_00_RESULT',
  TURBO_VEC: 'foundation audit inventory motion bytecode animation interface pixelbrain',
});

const BLOCK_B = Object.freeze({
  ...BLOCK_A,
  ID: BLOCK_B_ID,
  PHASE: '02:Canonical Schema',
  TITLE: 'Define AnimationBlueprintV1 canonical schema',
  NEXT: 'TERMINAL',
  MCP_KEYS: 'PDR_CCCB_PDR_02_00,PDR_CCCB_PDR_02_00_RESULT',
  TURBO_VEC: 'canonical schema intermediate representation animation blueprint typescript',
});

describe('cccbEncoder', () => {
  it('computes deterministic FNV-1a checksums used by the PDR examples', () => {
    expect(fnv1a32('PDR0100FNDTNDT')).toBe('2405625c');
    expect(fnv1a32('PDR0200CNNCLSCH')).toBe('55437683');
  });

  it('derives semantic slugs from consonant skeletons', () => {
    expect(deriveSemanticSlug('Foundation Audit')).toBe('FNDTNDT');
    expect(deriveSemanticSlug('Canonical Schema')).toBe('CNNCLSCH');
  });

  it('builds and parses CCCB IDs', () => {
    const id = buildCccbId({ domain: 'PDR', phaseId: 1, stepNum: 0, title: 'Foundation Audit' });
    expect(id).toBe(BLOCK_A_ID);

    expect(parseCccbId(id)).toMatchObject({
      domain: 'PDR',
      phaseId: '01',
      stepNum: '00',
      semanticSlug: 'FNDTNDT',
      checksumVerified: true,
    });
  });

  it('serializes and parses strict line-based blocks', () => {
    const serialized = serializeCccbBlock(BLOCK_A);
    expect(serialized).toContain('# INFUSION_ALLOW');
    expect(serialized).toContain('CCCB_START');
    expect(serialized).toContain('CCCB_END');

    expect(parseCccbBlock(serialized)).toEqual(BLOCK_A);
  });

  it('verifies valid blocks and rejects checksum drift', () => {
    expect(verifyCccbBlock(BLOCK_A)).toMatchObject({
      valid: true,
      id: BLOCK_A_ID,
      checksumVerified: true,
    });

    const drifted = { ...BLOCK_A, ID: BLOCK_A.ID.replace('2405625c', '00000000') };
    const result = verifyCccbBlock(drifted);
    expect(result.valid).toBe(false);
    expect(result.errors[0].bytecode).toContain('PB-ERR-v1');
  });

  it('rejects unknown fields and missing required fields', () => {
    expect(verifyCccbBlock({ ...BLOCK_A, EXTRA: 'nope' }).valid).toBe(false);

    const missing = { ...BLOCK_A };
    delete missing.TURBO_VEC;
    expect(verifyCccbBlock(missing).valid).toBe(false);
  });

  it('extracts CCCB blocks from markdown', () => {
    const markdown = `# Doc\n\n${serializeCccbBlock(BLOCK_A)}\ntext\n${serializeCccbBlock(BLOCK_B)}`;
    const blocks = extractCccbBlocks(markdown);
    expect(blocks.map(block => block.ID)).toEqual([BLOCK_A_ID, BLOCK_B_ID]);
  });

  it('traverses block graph edges to TERMINAL', () => {
    const traversal = traverseCccbGraph([BLOCK_A, BLOCK_B], BLOCK_A_ID);
    expect(traversal).toEqual({
      terminal: true,
      steps: 2,
      path: [BLOCK_A_ID, BLOCK_B_ID],
    });
  });

  it('rejects graph cycles', () => {
    const cyclic = { ...BLOCK_B, NEXT: BLOCK_A_ID };
    expect(() => traverseCccbGraph([BLOCK_A, cyclic], BLOCK_A_ID)).toThrow();
  });
});

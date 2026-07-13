import { describe, expect, it } from 'vitest';
import { createEditor } from 'lexical';
import { TruesightWordNode } from '../../src/lib/lexical/TruesightNode.js';

const config = { theme: {}, namespace: 'test' };

async function renderNode(chroma) {
  const editor = createEditor({
    namespace: 'test',
    nodes: [TruesightWordNode],
    onError(error) {
      throw error;
    },
  });

  let dom;
  await editor.update(() => {
    const tokenData = chroma ? { precomputed: { chroma } } : null;
    dom = new TruesightWordNode('bold', '#4466CC', '', null, false, tokenData).createDOM(config);
  });
  return dom;
}

describe('TruesightWordNode chroma stamp', () => {
  it('stamps the bytecode onto the rendered span', async () => {
    const dom = await renderNode({ bytecode: 'PB-CHROMA-v2-DPK64-0f03c3cAA' });
    expect(dom.dataset.chroma).toBe('PB-CHROMA-v2-DPK64-0f03c3cAA');
  });

  it('stamps a REFUSED token too — a grey token must declare why it is grey', async () => {
    const dom = await renderNode({ bytecode: 'PB-CHROMA-v2-GSL32-000000__' });
    expect(dom.dataset.chroma).toBe('PB-CHROMA-v2-GSL32-000000__');
  });

  it('omits the attribute rather than inventing one when there is no stamp', async () => {
    const dom = await renderNode(null);
    expect(dom.dataset.chroma).toBeUndefined();
  });
});

/**
 * createReteEditor
 *
 * Minimal factory for a Rete.js NodeEditor using React renderer.
 * This is the interactive canvas only.
 */

import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import { AreaPlugin } from 'rete-area-plugin';
import { ConnectionPlugin } from 'rete-connection-plugin';
import { ReactPlugin, Presets } from 'rete-react-plugin';

type Schemes = GetSchemes<
  ClassicPreset.Node,
  ClassicPreset.Connection<ClassicPreset.Node, ClassicPreset.Node>
>;

export function createReteEditor(container: HTMLElement) {
  const editor = new NodeEditor<Schemes>();
  const area = new AreaPlugin<Schemes>(container);
  const connection = new ConnectionPlugin<Schemes>();
  const render = new ReactPlugin<Schemes>({ createRoot: (el: any) => {
    // In real app use React 18 createRoot
    // For skeleton we stub
    return { render: (c: any) => { el.innerHTML = ''; } };
  } });

  editor.use(area);
  editor.use(connection);
  editor.use(render);

  // Basic connection validation stub (real validation in pipes)
  connection.addPipe((context: any) => {
    if (context.type === 'connectioncreate') {
      // In full impl: call reteSocketRegistry validation
      console.log('[rete] connection attempted', context.data);
    }
    return context;
  });

  // Render preset
  render.addPreset(Presets.classic.setup());

  // Expose for adapter
  (editor as any).__area = area;

  return editor;
}

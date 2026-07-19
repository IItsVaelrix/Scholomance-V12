import { memo, useCallback, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { VoxelScenePortal } from '../../pages/DivWand/components/VoxelScenePortal.jsx';
import { WorldScenePortal } from '../../pages/DivWand/components/WorldScenePortal.jsx';
import './divwand-shared.css';

function snapPx(value, gridSize = 8) {
  return Math.round((Number(value) || 0) / gridSize) * gridSize;
}

const LayoutNode = memo(function LayoutNode({
  node,
  depth,
  isInspectorActive,
  hoveredId,
  onHover,
  onLeave,
  rootRef,
  slots,
}) {
  // mouseover/mouseout bubble, so stopPropagation makes the innermost node under
  // the cursor win without mutating the native event to dedupe handlers.
  const handleMouseEnter = useCallback((e) => {
    if (!node || !isInspectorActive) return;
    e.stopPropagation();
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const rootRect = rootRef.current?.getBoundingClientRect();
    onHover({
      id: node.id,
      role: node.role,
      type: node.type,
      depth,
      intendedLayout: node.layout || {},
      actualRect: {
        x:      Math.round(rect.left - (rootRect?.left ?? 0)),
        y:      Math.round(rect.top  - (rootRect?.top  ?? 0)),
        width:  Math.round(rect.width),
        height: Math.round(rect.height),
      },
    });
  }, [isInspectorActive, node, depth, onHover, rootRef]);

  const handleMouseLeave = useCallback((e) => {
    if (!node || !isInspectorActive) return;
    e.stopPropagation();
    onLeave(node.id);
  }, [isInspectorActive, node, onLeave]);

  if (!node) return null;

  const variantClass     = node.style?.variant    ? `variant-${node.style.variant}`    : '';
  const glowClass        = node.style?.glowColor   ? `div-glow-${node.style.glowColor}` : '';
  const interactiveClass = node.props?.interactive  ? 'div-interactive'                  : '';
  const highlightClass   = isInspectorActive && hoveredId === node.id ? 'inspector-highlight' : '';

  const className = ['div-node', variantClass, glowClass, interactiveClass, highlightClass]
    .filter(Boolean).join(' ');

  const style = {
    display:             node.layout?.display,
    position:            node.layout?.position,
    top:    typeof node.layout?.top    === 'number' ? `${snapPx(node.layout.top)}px`    : node.layout?.top,
    left:   typeof node.layout?.left   === 'number' ? `${snapPx(node.layout.left)}px`   : node.layout?.left,
    right:  typeof node.layout?.right  === 'number' ? `${snapPx(node.layout.right)}px`  : node.layout?.right,
    bottom: typeof node.layout?.bottom === 'number' ? `${snapPx(node.layout.bottom)}px` : node.layout?.bottom,
    width:   typeof node.layout?.width   === 'number' ? `${node.layout.width}px`   : node.layout?.width,
    height:  typeof node.layout?.height  === 'number' ? `${node.layout.height}px`  : node.layout?.height,
    padding: typeof node.layout?.padding === 'number' ? `${node.layout.padding}px` : node.layout?.padding,
    margin:  typeof node.layout?.margin  === 'number' ? `${node.layout.margin}px`  : node.layout?.margin,
    gap:     typeof node.layout?.gap     === 'number' ? `${node.layout.gap}px`     : node.layout?.gap,
    flexDirection:       node.layout?.flexDirection,
    justifyContent:      node.layout?.justifyContent,
    alignItems:          node.layout?.alignItems,
    gridTemplateColumns: node.layout?.gridTemplateColumns,
    gridTemplateRows:    node.layout?.gridTemplateRows,
    borderRadius: typeof node.style?.borderRadius === 'number' ? `${node.style.borderRadius}px` : node.style?.borderRadius,
    opacity: node.style?.opacity,
  };

  const sharedProps = {
    // NOTE: node.id is emitted as a real DOM id because the inspector QA suite
    // (and any external selector) queries nodes by `#id`. User JSON *can* carry
    // duplicate ids (invalid DOM), but that's an authoring-data concern, not
    // something to fix by breaking the id selector contract.
    id: node.id,
    className,
    style,
    onMouseOver: handleMouseEnter,
    onMouseOut: handleMouseLeave
  };

  if (node.type === 'voxel') {
    return <VoxelScenePortal node={node} />;
  }

  if (node.type === 'world') {
    return <WorldScenePortal node={node} />;
  }

  if (node.type === 'element') {
    return (
      <div {...sharedProps}>
        {node.role === 'text' && (
          <div className="div-elem-text">
            {node.props?.title    && <div className="div-elem-title">{node.props.title}</div>}
            {node.props?.subtitle && <div className="div-elem-subtitle">{node.props.subtitle}</div>}
            {node.props?.text     && <span>{node.props.text}</span>}
          </div>
        )}
        {node.role === 'badge' && <span className="div-elem-badge">{node.props?.text}</span>}
        {node.role === 'button' && <button className="div-elem-button">{node.props?.text || 'Submit'}</button>}
        {node.role === 'glow-container' && (
          <div className="div-elem-glow-container"><Sparkles size={22} /></div>
        )}
      </div>
    );
  }

  const slotChild =
    slots && node.role === 'header' ? slots.title :
    slots && node.role === 'content' ? slots.content :
    null;

  return (
    <div {...sharedProps}>
      {slotChild}
      {node.children?.map((child) => (
        <LayoutNode
          key={child.id}
          node={child}
          depth={depth + 1}
          isInspectorActive={isInspectorActive}
          hoveredId={hoveredId}
          onHover={onHover}
          onLeave={onLeave}
          rootRef={rootRef}
          slots={slots}
        />
      ))}
    </div>
  );
});

export function DivLayoutRenderer({
  proposal,
  slots = null,
  isInspectorActive = false,
  hoveredId = null,
  onHover = () => {},
  onLeave = () => {},
}) {
  const root = proposal?.proposedLayout;
  const rootRef = useRef(null);
  if (!root) return null;
  return (
    <div ref={rootRef} className="div-layout-root" style={{ width: '100%', height: '100%', position: 'relative' }}>
      <LayoutNode
        node={root}
        depth={0}
        isInspectorActive={isInspectorActive}
        hoveredId={hoveredId}
        onHover={onHover}
        onLeave={onLeave}
        rootRef={rootRef}
        slots={slots}
      />
    </div>
  );
}

// In-app event bus: lets PhaserLayer/GodotOverlay/scoring flow exchange
// combat events locally (separate from the remote WebSocket relay below).
class CombatBridge {
  constructor() {
    this._listeners = {};
    if (typeof window !== 'undefined') {
      window.__SCHOLOMANCE_COMBAT_BRIDGE__ = this;
    }
  }

  on(event, fn) {
    (this._listeners[event] = this._listeners[event] || []).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this._listeners[event];
    if (list) this._listeners[event] = list.filter(f => f !== fn);
  }

  emit(event, payload) {
    (this._listeners[event] || []).forEach(fn => fn(payload));
  }
}

export const combatBridge = new CombatBridge();

const RELAY_URL =
  import.meta.env.VITE_COMBAT_RELAY_URL || 'ws://127.0.0.1:3001';

let socket = null;
let commandHandler = null;
let reconnectTimer = null;
let pendingInitPacket = null;

export function connectCombatBridge() {
  if (socket && socket.readyState <= WebSocket.OPEN) return socket;

  socket = new WebSocket(RELAY_URL);

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({
      type: 'HELLO',
      role: 'host',
    }));
    if (pendingInitPacket) {
      socket.send(pendingInitPacket);
      pendingInitPacket = null;
    }
  });

  socket.addEventListener('message', (event) => {
    let packet;

    try {
      packet = JSON.parse(event.data);
    } catch {
      return;
    }

    if (packet.type === 'COMBAT_COMMAND' && commandHandler) {
      commandHandler(packet.command, packet);
    }
  });

  socket.addEventListener('close', () => {
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      connectCombatBridge();
    }, 1000);
  });

  return socket;
}

export function onCombatCommand(handler) {
  commandHandler = handler;

  return () => {
    if (commandHandler === handler) {
      commandHandler = null;
    }
  };
}

export function broadcastCombatInit(seed, initialState) {
  const packet = JSON.stringify({
    type: 'COMBAT_INIT',
    seed,
    snapshot: serializeStateForGodot(initialState),
    absoluteTimeMs: performance.now(),
  });

  const activeSocket = connectCombatBridge();
  if (activeSocket.readyState === WebSocket.OPEN) {
    activeSocket.send(packet);
  } else {
    pendingInitPacket = packet;
  }
}

export function broadcastCombatAction(actionPayload) {
  const activeSocket = connectCombatBridge();
  if (activeSocket.readyState !== WebSocket.OPEN) return;

  activeSocket.send(JSON.stringify({
    type: 'COMBAT_ACTION',
    action: actionPayload,
    absoluteTimeMs: performance.now(),
  }));
}

export function serializeStateForGodot(battleState) {
  if (!battleState) return null;
  return {
    round: battleState.round,
    turn: battleState.activeEntityId,
    rngState: battleState.metadata?.battleSeed || "0",
    units: (battleState.entities || []).map(e => ({
      id: e.id,
      hp: e.hp,
      mp: e.mp,
      ap: e.movesRemaining,
      col: e.position.x,
      row: e.position.y,
      statuses: e.statusEffects || []
    })),
    grid: {
      cols: battleState.gridWidth || 8,
      rows: battleState.gridHeight || 8,
      blocked: []
    }
  };
}

export function buildActionPayload(turnResult) {
  if (!turnResult) return null;
  
  let command = "";
  let resolvedSpell = null;

  if (turnResult.actionType === "move") {
    // We don't have delta easily, but origin and targetCell should give it
    const dx = turnResult.targetCell.x - turnResult.origin.x;
    const dy = turnResult.targetCell.y - turnResult.origin.y;
    command = `MOVE ${dx} ${dy}`;
  } else if (turnResult.actionType === "channel") {
    command = `CHANNEL ${turnResult.signals?.school || "SONIC"}`;
  } else if (turnResult.actionType === "wait") {
    command = "END_TURN";
  } else if (turnResult.actionType === "cast") {
    const spellId = turnResult.scoreData?.spellId || "mend";
    const targetString = turnResult.targetCell 
      ? `${turnResult.targetCell.x},${turnResult.targetCell.y}` 
      : "self";
    command = `CAST ${spellId} ${targetString}`;
    
    // Build deterministic effects
    const effects = [];
    if (turnResult.damageMap) {
       for (const d of turnResult.damageMap) {
         if (d.amount > 0) {
           effects.push({ kind: "DAMAGE", amount: d.amount, scalingBasis: "resolved_spell_power" });
         } else if (d.amount < 0) {
           effects.push({ kind: "HEAL", amount: Math.abs(d.amount), scalingBasis: "resolved_spell_power" });
         }
       }
    }
    
    resolvedSpell = {
      spellId,
      school: turnResult.scoreData?.school || "SONIC",
      intent: turnResult.scoreData?.intent?.speechAct || "damage",
      power: turnResult.scoreData?.damage || 10,
      cost: { mp: turnResult.mpCost || 10, ap: 1 },
      targeting: { mode: "unit", range: 4 },
      effects
    };
  } else if (turnResult.actionType === "counter") {
    // Opponent counter
    command = `COUNTER BASIC_STRIKE player`;
    const effects = [];
    if (turnResult.damageMap) {
       for (const d of turnResult.damageMap) {
         if (d.amount > 0) effects.push({ kind: "DAMAGE", amount: d.amount, scalingBasis: "resolved_spell_power" });
       }
    }
    resolvedSpell = {
      spellId: "basic_strike",
      school: turnResult.signals?.school || "SONIC",
      intent: "damage",
      power: turnResult.scoreData?.damage || 15,
      cost: { mp: 5, ap: 1 },
      targeting: { mode: "unit", range: 2 },
      effects
    };
  }

  return {
    actorId: turnResult.entityId,
    command,
    resolvedSpell
  };
}

export function disconnectCombatBridge() {
  if (reconnectTimer) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (socket) {
    socket.close();
    socket = null;
  }

  commandHandler = null;
}

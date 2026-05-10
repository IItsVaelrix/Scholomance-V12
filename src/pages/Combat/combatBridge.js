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

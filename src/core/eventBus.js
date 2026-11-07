// Presentation-side event bus. The sim writes state.events; Game drains them here after each tick.
export function createEventBus() {
  const map = new Map();
  return {
    on(type, fn) {
      if (!map.has(type)) map.set(type, []);
      map.get(type).push(fn);
      return () => map.set(type, map.get(type).filter((f) => f !== fn));
    },
    emit(ev) {
      const a = map.get(ev.type);
      if (a) for (const f of a) f(ev);
      const all = map.get('*');
      if (all) for (const f of all) f(ev);
    },
    emitAll(events) {
      for (const ev of events) this.emit(ev);
    },
  };
}

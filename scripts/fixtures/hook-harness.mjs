// Lightweight hook scheduler for handler tests without a DOM or new dependencies.
// This is not a browser/React renderer: effects run after each settled render.
let active;
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

export function useState(initial) {
  const host = active;
  const index = host.cursor++;
  if (!(index in host.slots)) host.slots[index] = typeof initial === 'function' ? initial() : initial;
  return [host.slots[index], value => {
    const next = typeof value === 'function' ? value(host.slots[index]) : value;
    if (!Object.is(next, host.slots[index])) {
      host.slots[index] = next;
      host.dirty = true;
    }
  }];
}
export function useRef(initial) {
  const host = active;
  const index = host.cursor++;
  return host.slots[index] ??= { current: initial };
}
export function useCallback(callback, deps) {
  const host = active;
  const index = host.cursor++;
  if (!same(host.slots[index]?.deps, deps)) host.slots[index] = { callback, deps };
  return host.slots[index].callback;
}
export function useEffect(effect, deps) {
  const host = active;
  const index = host.cursor++;
  if (!same(host.slots[index]?.deps, deps)) {
    const previous = host.slots[index];
    const slot = host.slots[index] = { deps };
    host.effects.push(() => { previous?.cleanup?.(); slot.cleanup = effect(); });
  }
}
export function mount(render) {
  const host = { slots: [], cursor: 0, dirty: true, effects: [] };
  return {
    render() {
      let result;
      let limit = 30;
      do {
        if (!limit--) throw new Error('Hook harness did not settle');
        host.cursor = 0;
        host.dirty = false;
        active = host;
        try { result = render(); } finally { active = undefined; }
        const effects = host.effects.splice(0);
        effects.forEach(effect => effect());
      } while (host.dirty);
      return result;
    },
    unmount() { host.slots.forEach(slot => slot?.cleanup?.()); },
  };
}

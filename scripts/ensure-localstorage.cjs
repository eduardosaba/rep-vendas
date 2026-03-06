// Ensure a safe `globalThis.localStorage` implementation exists in Node dev
try {
  if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
    const _store = Object.create(null);
    globalThis.localStorage = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null),
      setItem: (k, v) => { _store[k] = String(v); },
      removeItem: (k) => { delete _store[k]; },
      clear: () => { Object.keys(_store).forEach((k) => delete _store[k]); },
    };
  }
} catch (e) {
  // keep startup resilient — this shim is only for dev ergonomics
}

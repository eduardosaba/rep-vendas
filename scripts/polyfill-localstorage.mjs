// Polyfill global.localStorage with a safe in-memory adapter when missing
try {
  if (typeof globalThis.localStorage === 'undefined') {
    const _store = Object.create(null);
    globalThis.localStorage = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null),
      setItem: (k, v) => { _store[k] = String(v); },
      removeItem: (k) => { delete _store[k]; },
      clear: () => { Object.keys(_store).forEach((k) => delete _store[k]); },
    };
  } else if (typeof globalThis.localStorage.getItem !== 'function') {
    // Replace non-function implementations
    const _store = Object.create(null);
    globalThis.localStorage = {
      getItem: (k) => (Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null),
      setItem: (k, v) => { _store[k] = String(v); },
      removeItem: (k) => { delete _store[k]; },
      clear: () => { Object.keys(_store).forEach((k) => delete _store[k]); },
    };
  }
} catch (e) {
  // swallow errors — this is a best-effort dev helper
}

export {};

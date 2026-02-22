// Compatibility re-export to ensure module resolution works in all environments.
// Re-export explicitly from the TSX implementation to avoid resolving back
// to this shim (which would create a circular import when resolving
// without an extension).
export { Button } from './button.tsx';
export { default } from './button.tsx';

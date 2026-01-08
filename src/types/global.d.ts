declare module '*.css';
declare module '*.scss';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.svg' {
  const src: string;
  export default src;
}

interface Window {
  __REACT_DEVTOOLS_GLOBAL_HOOK__?: any;
}

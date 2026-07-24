interface WindowEnv {
  type?: string;
  version?: string;
}

declare global {
  interface Window {
    env?: WindowEnv;
  }
}

export {};

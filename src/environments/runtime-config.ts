type RuntimeConfig = {
  apiUrl?: string;
};

declare global {
  interface Window {
    __STUDENTSPACE_CONFIG__?: RuntimeConfig;
  }
}

const runtimeConfig =
  typeof window !== 'undefined' ? (window.__STUDENTSPACE_CONFIG__ ?? undefined) : undefined;

export const runtimeApiUrl = runtimeConfig?.apiUrl;

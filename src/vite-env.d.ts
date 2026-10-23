/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Sehat Saathi API, e.g. http://localhost:8000 (no trailing slash). Required in production builds. */
  readonly VITE_API_BASE_URL?: string;
}

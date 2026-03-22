/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API kökü (örn. https://api.site.com) — /uploads göreli yolları bu origin ile birleştirir */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

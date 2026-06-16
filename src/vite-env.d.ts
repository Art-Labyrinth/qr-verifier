/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string
  readonly VITE_API_KEY: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_SHORT_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

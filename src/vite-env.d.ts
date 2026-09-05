/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKEND_PROVIDER?: 'supabase' | 'cloudbase'
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_CLOUDBASE_ENV_ID?: string
  readonly VITE_CLOUDBASE_PUBLISHABLE_KEY?: string
  readonly VITE_CLOUDBASE_REGION?: string
  readonly VITE_ENABLE_DEV_TOOLS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

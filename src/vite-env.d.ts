/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MULTISYNQ_API_KEY: string
  // 可以在这里添加更多环境变量
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 
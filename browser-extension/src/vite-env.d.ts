interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_NATIVE_HOST_NAME: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_NATIVE_HOST_NAME: string;
  readonly VITE_JWT_SNIFFER_URI: string; // 'https://example.com,https://sub.example.com'
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

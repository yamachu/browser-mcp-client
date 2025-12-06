export const JWT_SNIFFER_URI = import.meta.env.VITE_JWT_SNIFFER_URI.split(",");
export const JWT_SNIFFER_HOSTS = JWT_SNIFFER_URI.map((uri) => {
  return new URL(uri).host;
});
export const NATIVE_HOST_NAME = import.meta.env.VITE_NATIVE_HOST_NAME;

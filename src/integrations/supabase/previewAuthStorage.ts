// Storage adapter for the Supabase auth client.
// Independent app: sessions are simply persisted in the browser's localStorage.
export function brokeredPreviewStorage() {
  if (typeof window === "undefined") return undefined;
  return localStorage;
}

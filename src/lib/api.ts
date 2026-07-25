/**
 * Base URL for the Express API.
 *
 * Host-relative by default: whatever host the app was opened from (localhost on
 * the laptop, the LAN IP on a phone), the API is assumed to be on the same host,
 * port 3001. This makes the app reachable from any device on the same Wi-Fi with
 * no per-device config.
 *
 * An explicit `VITE_API_BASE` (non-empty) always overrides — e.g. for a deployed
 * backend on a different host.
 */
const explicit = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();

export const API_BASE =
  explicit && explicit.length > 0
    ? explicit
    : `${window.location.protocol}//${window.location.hostname}:3001/api`;

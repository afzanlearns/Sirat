/**
 * Base URL for the Express API.
 *
 * Default is the same-origin path `/api`, which Vite proxies to the Express
 * server (see vite.config.ts). Keeping it same-origin means:
 *   - works over both HTTP and HTTPS with no mixed-content errors,
 *   - works from any device on the Wi-Fi (localhost or LAN IP) with no CORS,
 *   - no per-device config.
 *
 * Set `VITE_API_BASE` (non-empty) to override for a separately-hosted backend.
 */
const explicit = (import.meta.env.VITE_API_BASE as string | undefined)?.trim();

export const API_BASE = explicit && explicit.length > 0 ? explicit : "/api";

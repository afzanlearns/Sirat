import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync, existsSync } from 'node:fs'

// HTTPS is OPT-IN (set HTTPS=true) — needed only to test PWA install from a phone,
// which requires a secure origin. Normal `npm run dev` / `npm run preview` stay on
// plain HTTP (no cert warnings). Uses the self-signed cert in ./certs.
const wantHttps = process.env.HTTPS === 'true'
const keyPath = new URL('./certs/key.pem', import.meta.url)
const certPath = new URL('./certs/cert.pem', import.meta.url)
const https =
  wantHttps && existsSync(keyPath) && existsSync(certPath)
    ? { key: readFileSync(keyPath), cert: readFileSync(certPath) }
    : undefined

// Proxy /api to the Express server so the browser only talks to this origin
// (no mixed-content over HTTPS, no CORS). API stays plain HTTP behind the proxy.
const proxy = {
  '/api': { target: 'http://localhost:3001', changeOrigin: true },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { host: true, https, proxy },
  preview: { host: true, https, proxy },
})

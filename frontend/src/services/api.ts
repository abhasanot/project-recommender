// frontend/src/services/api.ts
import axios from 'axios';

/**
 * FIX (Bug): The original file used an absolute URL
 *   baseURL: 'http://localhost:5000/api'
 *
 * This has two problems:
 *  1. It bypasses the Vite proxy defined in vite.config.ts, so the proxy's
 *     changeOrigin magic is never applied.
 *  2. When withCredentials is true, CORS requires an explicit
 *     Access-Control-Allow-Origin header that matches the Origin exactly.
 *     Hardcoding 'http://localhost:5000' means the app breaks the moment the
 *     backend port changes, and is fragile in any deployed environment.
 *
 * Using a relative path '/api' lets Vite proxy the requests at dev time and
 * lets the production reverse-proxy handle them transparently in production.
 * Flask-CORS on the backend is still needed for any direct calls.
 */
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

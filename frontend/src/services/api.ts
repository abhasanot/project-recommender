// frontend/src/services/api.ts
import axios from 'axios';

/**
 * API client configuration.
 *
 * How the base URL is resolved (in priority order):
 *
 *  1. PRODUCTION (Vercel → Render):
 *     Set VITE_API_URL in the Vercel dashboard:
 *       VITE_API_URL = https://your-app.onrender.com
 *     The axios baseURL becomes: https://your-app.onrender.com/api
 *
 *  2. DOCKER (nginx reverse-proxy):
 *     VITE_API_URL is NOT set at build time in Docker → falls back to '/api'
 *     nginx proxies  GET /api/*  to  backend:5000/api/*
 *
 *  3. LOCAL DEV (Vite dev server):
 *     VITE_API_URL is NOT set → falls back to '/api'
 *     vite.config.ts proxy forwards  /api/*  to  http://localhost:5000
 *
 * NOTE: import.meta.env.VITE_* variables are replaced at BUILD TIME by Vite,
 * not at runtime. You must set them in Vercel's "Environment Variables" section
 * before deploying, not in the browser.
 */

const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

const api = axios.create({
  baseURL:         BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

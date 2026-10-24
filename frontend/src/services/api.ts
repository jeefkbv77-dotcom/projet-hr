// src/services/api.ts
import axios from 'axios'
import { useAuthStore } from '@/store/useStore'

// ⭐⭐⭐ BASE URL AVEC /api ⭐⭐⭐
const configuredApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined
const API_BASE_URL = configuredApiUrl && !configuredApiUrl.includes('localhost') && !configuredApiUrl.includes('127.0.0.1')
  ? configuredApiUrl
  : '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {},
  timeout: 30000,
})

/**
 * ⭐ Récupère le token JWT de manière robuste.
 * L'ordre de priorité est important :
 *  1. `smartrecruit_token` (clé utilisée par authService)
 *  2. Store Zustand persisté (auth-storage, authStore, auth)
 *  3. Store Zustand en mémoire
 *  4. Fallbacks legacy (token, sessionStorage)
 */
export const getToken = (): string | null => {
  try {
    // ⭐ 1. PRIORITÉ : clé utilisée par authService.setToken()
    const directToken = localStorage.getItem('smartrecruit_token')
    if (directToken) return directToken

    // ⭐ 2. Store Zustand persisté
    const possibleKeys = ['auth-storage', 'authStore', 'auth']
    for (const key of possibleKeys) {
      const storageData = localStorage.getItem(key)
      if (storageData) {
        try {
          const parsed = JSON.parse(storageData)
          if (parsed.state?.token) return parsed.state.token
          if (parsed.token) return parsed.token
          if (parsed.state?.auth?.token) return parsed.state.auth.token
          if (parsed.auth?.token) return parsed.auth.token
        } catch (e) {
          // ignore parsing errors
        }
      }
    }

    // ⭐ 3. Store Zustand en mémoire
    try {
      const state = useAuthStore.getState()
      if (state.token) return state.token
    } catch (e) {
      // ignore
    }

    // ⭐ 4. Fallbacks legacy
    const legacyLocal = localStorage.getItem('token')
    if (legacyLocal) return legacyLocal

    const legacySession = sessionStorage.getItem('token')
    if (legacySession) return legacySession

    return null
  } catch (error) {
    console.error('❌ Erreur dans getToken:', error)
    return null
  }
}

/**
 * Supprime toutes les données de session.
 * ⚠️ Ne doit être appelé QUE sur action explicite de l'utilisateur (logout).
 */
export const clearSession = () => {
  try {
    localStorage.removeItem('smartrecruit_token')
    localStorage.removeItem('smartrecruit_refresh_token')
    localStorage.removeItem('smartrecruit_user')
    localStorage.removeItem('auth-storage')
    localStorage.removeItem('authStore')
    localStorage.removeItem('auth')
    localStorage.removeItem('token')
    localStorage.removeItem('utilisateur')
    sessionStorage.removeItem('token')
    sessionStorage.removeItem('auth-storage')

    try {
      const store = useAuthStore.getState()
      if (store.logout) store.logout()
    } catch (e) {
      // ignore
    }
  } catch (error) {
    console.error('❌ Erreur clearSession:', error)
  }
}

api.interceptors.request.use(
  (config) => {
    // Ne pas écraser le Content-Type si FormData (le navigateur doit le définir)
    if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
      config.headers.delete?.('Content-Type')
      config.headers.delete?.('content-type')
    }

    const token = getToken()

    // ⭐ Log temporaire pour debug — à supprimer après résolution
    console.log(
      '🔌 INTERCEPTOR →',
      config.method?.toUpperCase(),
      config.baseURL + (config.url || ''),
      '| token:',
      token ? token.slice(0, 25) + '...' : 'NULL'
    )

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      return Promise.reject({
        ...error,
        isNetworkError: true,
        message: 'Impossible de contacter le serveur.',
      })
    }

    const status = error.response?.status
    const url = error.config?.url || ''

    // ⭐⭐⭐ CORRECTION CRITIQUE ⭐⭐⭐
    // NE JAMAIS supprimer le token automatiquement sur 401/403.
    // Un 401 peut venir de :
    //   - une route backend mal configurée
    //   - une race condition au démarrage
    //   - une requête vers une autre API
    //   - un rôle insuffisant (devrait être 403, mais parfois 401)
    // → Supprimer le token déconnecte l'utilisateur sans raison valable.
    // → La déconnexion doit être EXPLICITE (bouton logout).
    if (status === 401) {
      console.warn(`⚠️ 401 sur ${url} — token conservé (pas de clearSession automatique)`)
      return Promise.reject(error)
    }

    if (status === 403) {
      console.warn(`⚠️ 403 sur ${url} — accès refusé (token conservé)`)
      return Promise.reject(error)
    }

    if (status === 429) {
      return Promise.reject({
        ...error,
        isRateLimit: true,
        message: 'Trop de requêtes. Veuillez patienter.',
      })
    }

    if (status >= 500) {
      return Promise.reject({
        ...error,
        isServerError: true,
        message: 'Erreur serveur. Veuillez réessayer plus tard.',
      })
    }

    return Promise.reject(error)
  }
)

export default api
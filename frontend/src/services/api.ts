// src/services/api.ts
import axios from 'axios'
import { useAuthStore } from '@/store/useStore'

// ⭐⭐⭐ BASE URL AVEC /api ⭐⭐⭐
const configuredApiUrl = (import.meta as any).env?.VITE_API_URL as string | undefined
const API_BASE_URL = configuredApiUrl && !configuredApiUrl.includes('localhost') && !configuredApiUrl.includes('127.0.0.1')
  ? configuredApiUrl
  : '/api'

// ⭐ URL DE BASE POUR LES IMAGES/FICHIERS (sans le /api à la fin)
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {},
  timeout: 30000,
})

/**
 * ⭐ Récupère le token JWT de manière robuste.
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
    if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
      config.headers.delete?.('Content-Type')
      config.headers.delete?.('content-type')
    }

    const token = getToken()

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

// ⭐⭐⭐ FONCTIONS UTILES POUR CONSTRUIRE LES URL D'IMAGES ⭐⭐⭐
export const getCandidatPhotoUrl = (candidatId: number | string) => {
  if (!candidatId) return ''
  return `${API_ORIGIN}/api/candidats/${candidatId}/photo?t=${Date.now()}`
}

export const getEntrepriseLogoUrl = (entrepriseId: number | string) => {
  if (!entrepriseId) return ''
  return `${API_ORIGIN}/api/entreprises/${entrepriseId}/logo?t=${Date.now()}`
}

export const getCandidatPhotoByUserUrl = (userId: number | string) => {
  if (!userId) return ''
  return `${API_ORIGIN}/api/candidats/by-utilisateur/${userId}/photo?t=${Date.now()}`
}

export const getEntrepriseLogoByUserUrl = (userId: number | string) => {
  if (!userId) return ''
  return `${API_ORIGIN}/api/entreprises/by-utilisateur/${userId}/logo?t=${Date.now()}`
}

export const getFileUrl = (url: string) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`
}

export default api
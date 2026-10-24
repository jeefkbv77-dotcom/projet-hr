// src/store/useStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Utilisateur {
  id: number
  email?: string
  role?: 'candidat' | 'entreprise' | 'admin'
  actif?: boolean
  statut_profil?: 'candidat' | 'employe' | 'ancien_employe'
  date_embauche?: string
  entreprise_actuelle_id?: number
  photo_profil_url?: string
  bio?: string
  nom?: string
  prenom?: string
  username?: string
  nom_entreprise?: string
  photo?: string
  avatar_url?: string
  avatar?: string
  photo_url?: string
  image?: string
  logo?: string
  candidat?: {
    prenom?: string
    nom?: string
    photo?: string
    avatar?: string
  }
  entreprise?: {
    logo?: string
  }
  profil?: {
    photo?: string
  }
}

interface AuthState {
  utilisateur: Utilisateur | null
  token: string | null
  estConnecte: boolean
  setAuth: (utilisateur: Utilisateur, token: string) => void
  updateUser: (utilisateur: Utilisateur) => void
  refreshUser: () => Promise<void>
  logout: () => void
}

interface ThemeState {
  estModeSombre: boolean
  toggleTheme: () => void
}

interface NotificationState {
  notification: {
    message: string
    type: 'success' | 'error' | 'info' | 'warning'
  } | null
  afficherNotification: (message: any, type: 'success' | 'error' | 'info' | 'warning') => void
  masquerNotification: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      utilisateur: null,
      token: null,
      estConnecte: false,
      setAuth: (utilisateur, token) => {
        // ⭐ SAUVEGARDER AUSSI DANS localStorage SIMPLE POUR COMPATIBILITÉ
        localStorage.setItem('token', token)
        localStorage.setItem('utilisateur', JSON.stringify(utilisateur))
        sessionStorage.setItem('token', token)
        
        set({ utilisateur, token, estConnecte: true })
      },
      updateUser: (utilisateur) => {
        localStorage.setItem('utilisateur', JSON.stringify(utilisateur))
        set({ utilisateur })
      },
      refreshUser: async () => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token')
        if (!token) return
        try {
          const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (res.ok) {
            const data = await res.json()
            localStorage.setItem('utilisateur', JSON.stringify(data))
            set({ utilisateur: data })
          }
        } catch (e) {
          console.error("Erreur refreshUser:", e)
        }
      },
      logout: () => {
        // ⭐ NETTOYER TOUTES LES SOURCES
        localStorage.removeItem('token')
        localStorage.removeItem('utilisateur')
        localStorage.removeItem('auth-storage')
        sessionStorage.removeItem('token')
        
        set({ utilisateur: null, token: null, estConnecte: false })
      },
    }),
    {
      name: 'auth-storage',
      // ⭐ OPTION: getStorage pour utiliser localStorage
      getStorage: () => localStorage,
    }
  )
)

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      estModeSombre: false,
      toggleTheme: () => set((state) => ({ estModeSombre: !state.estModeSombre })),
    }),
    {
      name: 'theme-storage',
      getStorage: () => localStorage,
    }
  )
)

export const useNotificationStore = create<NotificationState>((set) => ({
  notification: null,
  afficherNotification: (message: any, type: 'success' | 'error' | 'info' | 'warning') => {
    // ⭐ EXTRAIRE LE MESSAGE SI C'EST UN OBJET
    let finalMessage = message
    
    if (typeof message === 'object' && message !== null) {
      if (message.msg) finalMessage = message.msg
      else if (message.message) finalMessage = message.message
      else if (message.detail) {
        if (typeof message.detail === 'string') finalMessage = message.detail
        else if (Array.isArray(message.detail)) {
          finalMessage = message.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ')
        } else {
          finalMessage = JSON.stringify(message.detail)
        }
      } else {
        finalMessage = JSON.stringify(message)
      }
    }
    
    set({ notification: { message: finalMessage, type } })
  },
  masquerNotification: () => set({ notification: null }),
}))
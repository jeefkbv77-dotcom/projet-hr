// src/services/authService.ts
import api from './api'
import { useAuthStore } from '@/store/useStore'

export interface Utilisateur {
  id: number
  email: string
  role: 'candidat' | 'entreprise' | 'admin'
  actif: boolean
  date_creation: string
  statut_profil?: 'candidat' | 'employe' | 'ancien_employe'
  date_embauche?: string
  entreprise_actuelle_id?: number
  photo_profil_url?: string
  bio?: string
  nom?: string
  prenom?: string
}

export interface CandidatData {
  nom: string
  prenom: string
  telephone?: string
  adresse?: string
  niveau_etude?: string
  annees_experience?: number
  disponibilite?: string
}

export interface EntrepriseData {
  nom: string
  description?: string
  adresse?: string
  site_web?: string
  secteur_activite?: string
  taille_entreprise?: string
}

export interface LoginCredentials {
  email: string
  mot_de_passe: string
}

export interface RegisterCandidatData {
  utilisateur: {
    email: string
    mot_de_passe: string
  }
  candidat: CandidatData
}

export interface RegisterEntrepriseData {
  utilisateur: {
    email: string
    mot_de_passe: string
  }
  entreprise: EntrepriseData
}

export interface TokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  refresh_token?: string
}

const optionalString = (value?: string) => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * ⭐ CLÉS DE STOCKAGE — DOIVENT ÊTRE ALIGNÉES AVEC getToken() DANS api.ts
 * - TOKEN : 'smartrecruit_token' (lu en priorité par getToken)
 */
const STORAGE_KEYS = {
  TOKEN: 'smartrecruit_token',
  REFRESH_TOKEN: 'smartrecruit_refresh_token',
  USER: 'smartrecruit_user',
  REMEMBERED_EMAIL: 'remembered_email',
} as const

class AuthService {
  private tokenKey = STORAGE_KEYS.TOKEN
  private refreshTokenKey = STORAGE_KEYS.REFRESH_TOKEN
  private userKey = STORAGE_KEYS.USER
  private rememberedEmailKey = STORAGE_KEYS.REMEMBERED_EMAIL

  // ===== Gestion du token =====

  /**
   * ⭐ Stocke le token à la fois dans localStorage (clé partagée)
   * ET dans le store Zustand, pour que getToken() le trouve partout.
   */
  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token)
    try {
      const store = useAuthStore.getState() as any
      // Si le store expose setAuth, l'appeler
      if (store.setAuth && store.utilisateur) {
        store.setAuth(store.utilisateur, token)
      } else if (typeof store.setToken === 'function') {
        store.setToken(token)
      }
    } catch (e) {
      // Pas grave si le store n'est pas disponible
    }
    console.log('✅ Token stocké')
  }

  getToken(): string | null {
    const token = localStorage.getItem(this.tokenKey)
    if (token) {
      console.log('🔑 Token récupéré')
    }
    return token
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey)
    localStorage.removeItem(this.refreshTokenKey)
    console.log('🗑️ Token supprimé')
  }

  setRefreshToken(token: string): void {
    localStorage.setItem(this.refreshTokenKey, token)
  }

  removeRefreshToken(): void {
    localStorage.removeItem(this.refreshTokenKey)
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.refreshTokenKey)
  }

  // ===== Gestion de l'utilisateur =====

  setUser(user: Utilisateur): void {
    localStorage.setItem(this.userKey, JSON.stringify(user))
    console.log('👤 Utilisateur stocké:', user.email)
  }

  getUser(): Utilisateur | null {
    const user = localStorage.getItem(this.userKey)
    if (user) {
      try {
        return JSON.parse(user)
      } catch {
        return null
      }
    }
    return null
  }

  removeUser(): void {
    localStorage.removeItem(this.userKey)
  }

  // ===== Gestion du "Remember me" =====

  setRememberedEmail(email: string): void {
    localStorage.setItem(this.rememberedEmailKey, email)
  }

  getRememberedEmail(): string | null {
    return localStorage.getItem(this.rememberedEmailKey)
  }

  removeRememberedEmail(): void {
    localStorage.removeItem(this.rememberedEmailKey)
  }

  // ===== Vérification du token =====

  isTokenValid(): boolean {
    const token = this.getToken()
    if (!token) return false

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const exp = payload.exp * 1000
      const now = Date.now()

      const isValid = now < exp - 60000 // marge de 60s
      console.log(`🔍 Token ${isValid ? 'valide' : 'expiré'}`)
      return isValid
    } catch (error) {
      console.error('❌ Erreur lors de la vérification du token:', error)
      return false
    }
  }

  isAuthenticated(): boolean {
    const hasToken = !!this.getToken()
    const hasUser = !!this.getUser()
    const isValid = this.isTokenValid()

    const isAuth = hasToken && hasUser && isValid
    console.log(`🔐 Authentifié: ${isAuth}`)
    return isAuth
  }

  // ===== Méthodes d'authentification =====

  login = async (credentials: LoginCredentials): Promise<TokenResponse> => {
    console.log('🔐 Tentative de connexion:', credentials.email)

    try {
      const payload = {
        email: credentials.email,
        mot_de_passe: credentials.mot_de_passe,
      }
      console.log('📤 Envoi au backend:', { ...payload, mot_de_passe: '***' })

      const response = await api.post<TokenResponse>('/auth/login', payload)
      console.log('✅ Réponse reçue:', response.data)

      if (!response.data.access_token) {
        throw new Error('Token non reçu du serveur')
      }

      this.setToken(response.data.access_token)

      if (response.data.refresh_token) {
        this.setRefreshToken(response.data.refresh_token)
      }

      return response.data
    } catch (error: any) {
      console.error('❌ Erreur de login:', error)
      this.removeToken()
      this.removeUser()
      throw error
    }
  }

  registerCandidat = async (data: RegisterCandidatData): Promise<Utilisateur> => {
    console.log('📝 Inscription candidat:', data.utilisateur.email)

    try {
      const payload = {
        utilisateur: {
          email: data.utilisateur.email,
          mot_de_passe: data.utilisateur.mot_de_passe,
        },
        candidat: {
          nom: data.candidat.nom,
          prenom: data.candidat.prenom,
          telephone: optionalString(data.candidat.telephone),
          adresse: optionalString(data.candidat.adresse),
          niveau_etude: optionalString(data.candidat.niveau_etude),
          annees_experience: Number(data.candidat.annees_experience ?? 0),
          disponibilite: optionalString(data.candidat.disponibilite) || 'immediate',
        },
      }
      console.log('📤 Envoi au backend:', {
        ...payload,
        utilisateur: { ...payload.utilisateur, mot_de_passe: '***' },
      })

      const response = await api.post<Utilisateur>('/auth/register/candidat', payload)
      console.log('✅ Réponse reçue:', response.data)
      return response.data
    } catch (error) {
      console.error("❌ Erreur d'inscription:", error)
      throw error
    }
  }

  registerEntreprise = async (data: RegisterEntrepriseData): Promise<Utilisateur> => {
    console.log('🏢 Inscription entreprise:', data.utilisateur.email)

    try {
      const payload = {
        utilisateur: {
          email: data.utilisateur.email,
          mot_de_passe: data.utilisateur.mot_de_passe,
        },
        entreprise: {
          nom: data.entreprise.nom,
          description: optionalString(data.entreprise.description),
          adresse: optionalString(data.entreprise.adresse),
          site_web: optionalString(data.entreprise.site_web),
          secteur_activite: optionalString(data.entreprise.secteur_activite),
          taille_entreprise: optionalString(data.entreprise.taille_entreprise),
        },
      }
      console.log('📤 Envoi au backend:', {
        ...payload,
        utilisateur: { ...payload.utilisateur, mot_de_passe: '***' },
      })

      const response = await api.post<Utilisateur>('/auth/register/entreprise', payload)
      console.log('✅ Réponse reçue:', response.data)
      return response.data
    } catch (error) {
      console.error("❌ Erreur d'inscription:", error)
      throw error
    }
  }

  /**
   * ⭐ Récupère le profil utilisateur.
   * - Si `token` est fourni (juste après login), l'utilise explicitement.
   * - Sinon, laisse l'interceptor ajouter le header depuis getToken().
   */
  getMe = async (token?: string): Promise<Utilisateur> => {
    console.log('👤 Récupération du profil utilisateur')

    try {
      const config = token
        ? { headers: { Authorization: `Bearer ${token}` } }
        : {}
      if (token) console.log('🔑 Utilisation du token fourni')
      else console.log('🔑 Utilisation du token du store')

      const response = await api.get<Utilisateur>('/auth/me', config)
      console.log('✅ Profil reçu:', response.data)

      this.setUser(response.data)
      return response.data
    } catch (error: any) {
      console.error('❌ Erreur getMe:', error)

      if (error.response?.status === 401) {
        this.removeToken()
        this.removeUser()
      }

      throw error
    }
  }

  // ===== Rafraîchissement du token =====

  refreshToken = async (): Promise<string | null> => {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) {
      console.log('❌ Pas de refresh token disponible')
      return null
    }

    try {
      console.log('🔄 Rafraîchissement du token...')
      const response = await api.post<{ access_token: string }>('/auth/refresh', {
        refresh_token: refreshToken,
      })

      const newToken = response.data.access_token
      this.setToken(newToken)
      console.log('✅ Token rafraîchi')
      return newToken
    } catch (error) {
      console.error('❌ Erreur lors du rafraîchissement:', error)
      this.removeToken()
      this.removeUser()
      this.removeRefreshToken()
      return null
    }
  }

  // ===== Déconnexion =====

  logout = async (): Promise<void> => {
    console.log('🚪 Déconnexion...')

    try {
      const token = this.getToken()
      if (token) {
        await api.post(
          '/auth/logout',
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }
    } catch (error) {
      console.log('⚠️ Erreur lors de la déconnexion serveur:', error)
    } finally {
      this.removeToken()
      this.removeRefreshToken()
      this.removeUser()
      console.log('✅ Déconnecté')
    }
  }

  // ===== Méthodes utilitaires =====

  hasRole(role: string | string[]): boolean {
    const user = this.getUser()
    if (!user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role)
  }

  getFullName(): string {
    const user = this.getUser()
    if (!user) return ''
    if (user.nom && user.prenom) return `${user.prenom} ${user.nom}`
    return user.email || ''
  }

  getCurrentUser(): Utilisateur | null {
    return this.getUser()
  }

  clearAll(): void {
    this.removeToken()
    this.removeRefreshToken()
    this.removeUser()
    console.log('🧹 Toutes les données nettoyées')
  }
}

export const authService = new AuthService()
export type { AuthService }
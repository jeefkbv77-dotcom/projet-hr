// src/services/offreService.ts
import api from './api'

export interface Offre {
  id: number
  titre: string
  description: string
  poste_id: number
  contrat_id: number
  localisation?: string
  salaire_min?: number
  salaire_max?: number
  date_publication: string
  date_expiration?: string
  statut: 'BROUILLON' | 'ACTIVE' | 'COMBLEE' | 'EXPIREE'
  entreprise_id: number
  entreprise_nom?: string
  poste_titre?: string
  contrat_type?: string
  competences: { id: number; nom: string }[]
  nombre_candidatures: number
  compatibilite?: number
  type_contrat?: string
}

export interface OffreCreate {
  titre: string
  description: string
  poste_id: number
  contrat_id: number
  localisation?: string
  salaire_min?: number
  salaire_max?: number
  date_expiration?: string
  competence_ids: number[]
  statut?: 'BROUILLON' | 'ACTIVE' | 'COMBLEE' | 'EXPIREE'
}

export interface ScoreResponse {
  score: number
  niveau: string
  competences_matchees: string[]
  competences_manquantes: string[]
  total_requises: number
  total_matchees: number
}

export const offreService = {
  getOffres: async (): Promise<Offre[]> => {
    const response = await api.get<Offre[]>('/offres/')
    return Array.isArray(response.data) ? response.data : []
  },

  getMesOffres: async (): Promise<Offre[]> => {
    const response = await api.get<Offre[]>('/offres/mes-offres')
    return response.data
  },

  getOffre: async (id: number): Promise<Offre> => {
    const response = await api.get<Offre>(`/offres/${id}`)
    return response.data
  },

  createOffre: async (offre: OffreCreate): Promise<Offre> => {
    const payload = {
      ...offre,
      statut: offre.statut || 'ACTIVE'
    }
    const response = await api.post<Offre>('/offres', payload)
    return response.data
  },

  updateOffre: async (id: number, offre: Partial<OffreCreate>): Promise<Offre> => {
    const response = await api.put<Offre>(`/offres/${id}`, offre)
    return response.data
  },

  deleteOffre: async (id: number): Promise<void> => {
    await api.delete(`/offres/${id}`)
  },

  // ⭐ POSTULER À UNE OFFRE
  postuler: async (offreId: number): Promise<void> => {
    await api.post(`/offres/${offreId}/postuler`)
  },

  // ⭐ CALCULER LE SCORE DE COMPATIBILITÉ
  getScore: async (offreId: number): Promise<ScoreResponse> => {
    const response = await api.get<ScoreResponse>(`/offres/${offreId}/score`)
    return response.data
  },

  // ⭐ RÉCUPÉRER LES RECOMMANDATIONS
  getRecommandations: async (limit: number = 10): Promise<Offre[]> => {
    const response = await api.get<Offre[]>(`/offres/recommandations?limit=${limit}`)
    return response.data
  },

  getPostes: async (): Promise<{ id: number; titre: string }[]> => {
    const response = await api.get('/postes')
    return response.data
  },

  getContrats: async (): Promise<{ id: number; type_contrat: string }[]> => {
    const response = await api.get('/contrats')
    return response.data
  },

  getCompetences: async (): Promise<{ id: number; nom: string; categorie: string }[]> => {
    const response = await api.get('/competences')
    return response.data
  }
}
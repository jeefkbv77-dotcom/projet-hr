// src/services/entrepriseService.ts
import api from './api'

export interface Entreprise {
  id: number
  nom: string
  description?: string
  logo_path?: string
  adresse?: string
  site_web?: string
  secteur_activite?: string
  taille_entreprise?: string
}

export type StatutOffre = 'ACTIVE' | 'COMBLEE' | 'BROUILLON' | 'EXPIREE'

export interface Offre {
  id: number
  titre: string
  description: string
  poste_id?: number
  contrat_id?: number
  localisation?: string
  salaire_min?: number
  salaire_max?: number
  date_publication: string
  date_expiration?: string
  statut: StatutOffre
  entreprise_nom: string
  poste_titre: string
  contrat_type: string
  competences: any[]
  nombre_candidatures: number
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
  statut?: StatutOffre
}

export interface OffreUpdate {
  titre?: string
  description?: string
  poste_id?: number
  contrat_id?: number
  localisation?: string
  salaire_min?: number
  salaire_max?: number
  date_expiration?: string
  competence_ids?: number[]
  statut?: StatutOffre
}

export const entrepriseService = {
  // Obtenir mon entreprise
  getMonEntreprise: async (): Promise<Entreprise> => {
    const response = await api.get('/entreprises/me')
    return response.data
  },

  // Mettre à jour mon entreprise
  updateMonEntreprise: async (data: Partial<Entreprise>): Promise<Entreprise> => {
    const response = await api.put('/entreprises/me', data)
    return response.data
  },

  // Upload logo d'entreprise
  uploadLogo: async (file: File): Promise<{ message: string; logo_url: string }> => {
    const formData = new FormData()
    formData.append('fichier', file)
    const response = await api.post('/entreprises/me/logo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // Obtenir mes offres
  getMesOffres: async (): Promise<Offre[]> => {
    const response = await api.get('/offres/mes-offres')
    return response.data
  },

  // Créer une offre
  createOffre: async (offre: OffreCreate): Promise<Offre> => {
    const payload = {
      ...offre,
      statut: offre.statut || 'ACTIVE'
    }
    const response = await api.post('/offres', payload)
    return response.data
  },

  // Mettre à jour une offre
  updateOffre: async (offreId: number, data: OffreUpdate): Promise<Offre> => {
    const response = await api.put(`/offres/${offreId}`, data)
    return response.data
  },

  // Supprimer une offre
  deleteOffre: async (offreId: number): Promise<void> => {
    await api.delete(`/offres/${offreId}`)
  }
}
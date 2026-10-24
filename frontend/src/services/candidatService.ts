// src/services/candidatService.ts
import api from './api'

export interface CandidatProfil {
  id: number
  nom: string
  prenom: string
  telephone?: string
  adresse?: string
  cv_path?: string
  niveau_etude: string
  annees_experience: number
  disponibilite: string
  email: string
  competences: Competence[]
  formations: Formation[]
  nombre_candidatures: number
  a_photo?: boolean
  a_cv?: boolean
  a_lettre_motivation?: boolean  // ⭐ AJOUTÉ
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  site_web?: string
}

export interface Competence {
  id: number
  nom: string
  categorie: string
  description?: string
}

export interface Formation {
  id: number
  titre: string
  etablissement?: string
  domaine?: string
  niveau?: string
  date_debut?: string
  date_fin?: string
  description?: string
}

export interface FormationCreate {
  titre: string
  etablissement?: string
  domaine?: string
  niveau?: string
  date_debut?: string
  date_fin?: string
  description?: string
}

export const candidatService = {
  /**
   * Récupérer le profil du candidat connecté
   */
  getMonProfil: async (): Promise<CandidatProfil> => {
    const response = await api.get('/candidats/me')
    return response.data
  },

  /**
   * Mettre à jour le profil du candidat
   */
  updateMonProfil: async (data: Partial<CandidatProfil>): Promise<CandidatProfil> => {
    const response = await api.put('/candidats/me', data)
    return response.data
  },

  /**
   * Uploader la photo de profil
   */
  uploadPhoto: async (file: File): Promise<{ message: string; photo_url: string }> => {
    const formData = new FormData()
    formData.append('fichier', file)
    const response = await api.post('/candidats/me/photo', formData)
    return response.data
  },

  /**
   * Uploader le CV
   */
  uploadCV: async (file: File): Promise<{ message: string; cv_url: string }> => {
    const formData = new FormData()
    formData.append('fichier', file)
    const response = await api.post('/candidats/me/cv', formData)
    return response.data
  },

  /**
   * ⭐ Uploader la lettre de motivation - NOUVEAU
   */
  uploadLettreMotivation: async (file: File): Promise<{ message: string; url: string }> => {
    const formData = new FormData()
    formData.append('fichier', file)
    const response = await api.post('/candidats/me/lettre-motivation', formData)
    return response.data
  },

  /**
   * Ajouter une compétence au profil
   */
  ajouterCompetence: async (competenceId: number, niveau: string): Promise<void> => {
    await api.post('/candidats/me/competences', {
      competence_id: competenceId,
      niveau
    })
  },

  /**
   * Supprimer une compétence du profil
   */
  supprimerCompetence: async (competenceId: number): Promise<void> => {
    await api.delete(`/candidats/me/competences/${competenceId}`)
  },

  /**
   * Ajouter une formation au profil
   */
  ajouterFormation: async (formation: FormationCreate): Promise<Formation> => {
    const response = await api.post('/candidats/me/formations', formation)
    return response.data
  },

  /**
   * Supprimer une formation du profil
   */
  supprimerFormation: async (formationId: number): Promise<void> => {
    await api.delete(`/candidats/me/formations/${formationId}`)
  },

  /**
   * Récupérer toutes les compétences disponibles
   */
  getCompetencesDisponibles: async (): Promise<Competence[]> => {
    const response = await api.get('/competences')
    return response.data
  },

  /**
   * Récupérer les candidatures du candidat
   */
  getMesCandidatures: async (): Promise<any[]> => {
    const response = await api.get('/candidats/me/candidatures')
    return response.data
  }
}
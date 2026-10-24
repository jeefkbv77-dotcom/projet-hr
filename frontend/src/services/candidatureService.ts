// src/services/candidatureService.ts
import api from './api'

export interface Candidature {
  id: number
  candidat_id: number
  offre_id: number
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'ENTRETIEN' | 'ACCEPTEE' | 'REFUSEE'
  date_candidature: string
  date_modification?: string
  date_entretien?: string
  notes?: string
  candidat_nom?: string
  candidat_prenom?: string
  offre_titre?: string
  entreprise_nom?: string
  score_compatibilite?: number
  a_cv: boolean
  a_lettre_motivation?: boolean  // ⭐ AJOUTÉ
}

export interface CandidatureUpdate {
  statut?: 'EN_ATTENTE' | 'EN_COURS' | 'ENTRETIEN' | 'ACCEPTEE' | 'REFUSEE'
  date_entretien?: string
  notes?: string
}

export interface ConvertEmployeData {
  poste_id?: number
  departement_id?: number
  contrat_id?: number
  date_embauche?: string
  titre_poste?: string
}

export const candidatureService = {
  getMesCandidatures: async (): Promise<Candidature[]> => {
    const response = await api.get('/candidatures/mes-candidatures')
    // ⭐ S'assurer que a_lettre_motivation est défini
    return response.data.map((c: any) => ({
      ...c,
      a_lettre_motivation: c.a_lettre_motivation || false,
      a_cv: c.a_cv || false
    }))
  },

  getCandidaturesByOffre: async (offreId: number): Promise<Candidature[]> => {
    const response = await api.get(`/candidatures/offre/${offreId}`)
    return response.data.map((c: any) => ({
      ...c,
      a_lettre_motivation: c.a_lettre_motivation || false,
      a_cv: c.a_cv || false
    }))
  },

  getCandidature: async (id: number): Promise<Candidature> => {
    const response = await api.get(`/candidatures/${id}`)
    return {
      ...response.data,
      a_lettre_motivation: response.data.a_lettre_motivation || false,
      a_cv: response.data.a_cv || false
    }
  },

  updateCandidature: async (id: number, data: CandidatureUpdate): Promise<Candidature> => {
    const response = await api.put(`/candidatures/${id}`, data)
    return {
      ...response.data,
      a_lettre_motivation: response.data.a_lettre_motivation || false,
      a_cv: response.data.a_cv || false
    }
  },

  accepterCandidature: async (id: number): Promise<Candidature> => {
    const response = await api.put(`/candidatures/${id}/accepter`)
    return {
      ...response.data,
      a_lettre_motivation: response.data.a_lettre_motivation || false,
      a_cv: response.data.a_cv || false
    }
  },

  refuserCandidature: async (id: number): Promise<Candidature> => {
    const response = await api.put(`/candidatures/${id}/refuser`)
    return {
      ...response.data,
      a_lettre_motivation: response.data.a_lettre_motivation || false,
      a_cv: response.data.a_cv || false
    }
  },

  convertirEnEmploye: async (candidatureId: number, data: ConvertEmployeData): Promise<any> => {
    const response = await api.post(`/candidatures/${candidatureId}/convertir`, data)
    return response.data
  }
}
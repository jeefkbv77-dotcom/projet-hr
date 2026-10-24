import api from './api'

export interface Statistiques {
  total_utilisateurs: number
  total_candidats: number
  total_entreprises: number
  total_offres: number
  total_candidatures: number
  total_competences: number
  utilisateurs_actifs: number
  offres_actives: number
}

export interface OntologyStatus {
  total_triples: number
  total_classes: number
  total_properties: number
  total_individuals: number
  total_candidats: number
  total_entreprises: number
  total_offres: number
  total_employes: number
  total_competences: number
}

export interface Utilisateur {
  id: number
  email: string
  role: 'candidat' | 'entreprise' | 'admin'
  actif: boolean
  date_creation: string
}

export const adminService = {
  // Obtenir les statistiques globales
  getStatistiques: async (): Promise<Statistiques> => {
    const response = await api.get('/admin/statistiques')
    return response.data
  },

  // Obtenir les statistiques de l'ontologie OWL en temps réel
  getOntologyStatus: async (): Promise<OntologyStatus> => {
    const response = await api.get('/admin/ontology-status')
    return response.data
  },

  // Resynchroniser manuellement l'ontologie OWL depuis MySQL
  resyncOntology: async (): Promise<{ message: string; stats: OntologyStatus }> => {
    const response = await api.post('/admin/resync-ontology')
    return response.data
  },

  // Obtenir la liste des utilisateurs
  getUtilisateurs: async (params?: {
    skip?: number
    limit?: number
    role?: string
    actif?: boolean
  }): Promise<{ utilisateurs: Utilisateur[]; total: number }> => {
    const response = await api.get('/admin/utilisateurs', { params })
    return response.data
  },

  // Obtenir les utilisateurs récents
  getUtilisateursRecents: async (limit: number = 10): Promise<Utilisateur[]> => {
    const response = await api.get('/admin/utilisateurs/recents', { params: { limit } })
    return response.data
  },

  // Activer un utilisateur
  activerUtilisateur: async (utilisateurId: number): Promise<void> => {
    await api.put(`/admin/utilisateurs/${utilisateurId}/activer`)
  },

  // Désactiver un utilisateur
  desactiverUtilisateur: async (utilisateurId: number): Promise<void> => {
    await api.put(`/admin/utilisateurs/${utilisateurId}/desactiver`)
  },

  // Supprimer un utilisateur
  supprimerUtilisateur: async (utilisateurId: number): Promise<void> => {
    await api.delete(`/admin/utilisateurs/${utilisateurId}`)
  }
}

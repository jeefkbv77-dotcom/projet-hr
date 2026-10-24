// src/services/departementService.ts
import api from './api'

export interface Departement {
  id: number
  entreprise_id: number
  nom: string
  description?: string
  owl_iri?: string
  date_creation: string
  date_modification?: string
  nombre_employes?: number
}

export interface DepartementCreate {
  nom: string
  description?: string
}

export const departementService = {
  /**
   * Récupérer tous les départements de l'entreprise connectée
   */
  getDepartements: async (entrepriseId?: number): Promise<Departement[]> => {
    try {
      // ⭐ ESSAYER AVEC SLASH FINAL D'ABORD
      const params = entrepriseId ? { entreprise_id: entrepriseId } : {}
      const response = await api.get('/departements/', { params })
      return response.data
    } catch (error: any) {
      // ⭐ SI 404, ESSAYER SANS SLASH
      if (error.response?.status === 404) {
        const params = entrepriseId ? { entreprise_id: entrepriseId } : {}
        const response = await api.get('/departements', { params })
        return response.data
      }
      throw error
    }
  },

  /**
   * Récupérer un département par son ID
   */
  getDepartement: async (id: number): Promise<Departement> => {
    try {
      const response = await api.get(`/departements/${id}/`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        const response = await api.get(`/departements/${id}`)
        return response.data
      }
      throw error
    }
  },

  /**
   * Créer un nouveau département
   * ⭐ CORRECTION : Utiliser /departements/ avec slash final
   */
  createDepartement: async (data: DepartementCreate): Promise<Departement> => {
    try {
      // ⭐ PRIORITÉ 1: Essayer avec slash final (format REST standard)
      const response = await api.post('/departements/', data)
      return response.data
    } catch (error: any) {
      // ⭐ PRIORITÉ 2: Si 405 (Method Not Allowed), essayer sans slash
      if (error.response?.status === 405) {
        console.warn('⚠️ POST /departements/ a échoué (405), essai sans slash...')
        const response = await api.post('/departements', data)
        return response.data
      }
      // ⭐ PRIORITÉ 3: Si 404, essayer sans slash aussi
      if (error.response?.status === 404) {
        console.warn('⚠️ POST /departements/ a échoué (404), essai sans slash...')
        const response = await api.post('/departements', data)
        return response.data
      }
      throw error
    }
  },

  /**
   * Mettre à jour un département
   */
  updateDepartement: async (id: number, data: Partial<DepartementCreate>): Promise<Departement> => {
    try {
      const response = await api.put(`/departements/${id}/`, data)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 405) {
        const response = await api.put(`/departements/${id}`, data)
        return response.data
      }
      throw error
    }
  },

  /**
   * Supprimer un département
   */
  deleteDepartement: async (id: number): Promise<void> => {
    try {
      await api.delete(`/departements/${id}/`)
    } catch (error: any) {
      if (error.response?.status === 404 || error.response?.status === 405) {
        await api.delete(`/departements/${id}`)
        return
      }
      throw error
    }
  }
}
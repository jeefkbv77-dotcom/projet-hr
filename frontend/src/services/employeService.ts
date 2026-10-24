// src/services/employeService.ts
import api from './api'

export interface Employe {
  id: number
  utilisateur_id?: number
  nom: string
  prenom: string
  email?: string
  telephone?: string
  adresse?: string
  photo_path?: string
  departement_id?: number
  poste_id?: number
  contrat_id?: number
  date_embauche?: string
  titre_poste?: string
  biographie?: string
  departement_nom?: string
  poste_titre?: string
  contrat_type?: string
}

export interface EmployeCreate {
  utilisateur_id?: number
  nom: string
  prenom: string
  email?: string
  telephone?: string
  adresse?: string
  departement_id?: number
  poste_id?: number
  contrat_id?: number
  date_embauche?: string
  titre_poste?: string
  biographie?: string
}

export const employeService = {
  // ⭐ SLASH FINAL — le backend expose @router.get("/")
  getEmployes: async (entrepriseId?: number): Promise<Employe[]> => {
    const params = entrepriseId ? { entreprise_id: entrepriseId } : {}
    const response = await api.get('/employes/', { params })
    return response.data
  },

  getEmploye: async (id: number): Promise<Employe> => {
    const response = await api.get(`/employes/${id}`)
    return response.data
  },

  // ⭐ SLASH FINAL — le backend expose @router.post("/")
  createEmploye: async (data: EmployeCreate): Promise<Employe> => {
    const response = await api.post('/employes/', data)
    return response.data
  },

  updateEmploye: async (id: number, data: Partial<EmployeCreate>): Promise<Employe> => {
    const response = await api.put(`/employes/${id}`, data)
    return response.data
  },

  deleteEmploye: async (id: number): Promise<void> => {
    await api.delete(`/employes/${id}`)
  },

  convertirCandidat: async (candidatId: number, data: Partial<EmployeCreate>): Promise<Employe> => {
    const response = await api.post(`/candidats/${candidatId}/convertir`, data)
    return response.data
  }
}
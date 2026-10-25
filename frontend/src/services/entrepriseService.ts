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

// ⭐ FONCTION DE COMPRESSION D'IMAGE (IDENTIQUE À CELLE DU CANDIDAT)
const compresserImage = (file: File, maxWidth: number = 800, quality: number = 0.7): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              reject(new Error('Compression échouée'))
            }
          },
          'image/jpeg',
          quality
        )
      }
      img.onerror = (error) => reject(error)
    }
    reader.onerror = (error) => reject(error)
  })
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

  // ⭐ UPLOAD DU LOGO AVEC COMPRESSION AUTOMATIQUE
  uploadLogo: async (file: File): Promise<{ message: string; logo_url: string }> => {
    try {
      // On compresse l'image avant de l'envoyer
      const compressedFile = await compresserImage(file)
      
      const formData = new FormData()
      formData.append('fichier', compressedFile)
      
      const response = await api.post('/entreprises/me/logo', formData)
      return response.data
    } catch (error) {
      console.error('❌ Erreur lors de la compression ou de l\'envoi du logo:', error)
      throw error
    }
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
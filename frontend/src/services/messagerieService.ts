// src/services/messagerieService.ts
import api from './api'

export interface UtilisateurMini {
  id: number
  email: string
  role: string
  statut_profil?: string
  photo_profil_url?: string
  display_name?: string
}

export interface Message {
  id: number
  conversation_id: number
  expediteur_id: number
  type_message: string
  contenu?: string
  piece_jointe_id?: number
  file_name?: string
  file_size?: number
  mime_type?: string
  duration?: number
  thumbnail_url?: string
  file_url?: string
  download_url?: string
  est_modifie: boolean
  est_supprime: boolean
  message_parent_id?: number
  date_envoi: string
  date_modification?: string
  expediteur?: UtilisateurMini
  lu_par?: Array<{ utilisateur_id: number; date_lu: string }>
}

export interface Conversation {
  id: number
  type_conversation: string
  nom_groupe?: string
  description?: string
  photo_groupe_url?: string
  est_archive: boolean
  est_epingle: boolean
  est_actif: boolean
  date_creation: string
  date_modification?: string
  participants: UtilisateurMini[]
  dernier_message?: Message
}

export interface RechercheUtilisateurResult extends UtilisateurMini {}

export interface ConversationCreateData {
  type_conversation: 'individuel' | 'groupe'
  participant_ids: number[]
  nom_groupe?: string
  description?: string
  photo_groupe_url?: string
}

export interface MessageCreateData {
  conversation_id: number
  type_message: 'text' | 'image' | 'video' | 'audio' | 'document' | 'file' | 'voice' | 'other'
  contenu?: string
  piece_jointe_id?: number
  file_name?: string
  file_size?: number
  mime_type?: string
  duration?: number
  thumbnail_url?: string
}

export const messagerieService = {
  getConversations: async (): Promise<Conversation[]> => {
    const response = await api.get('/messagerie/conversations')
    return response.data
  },

  getConversation: async (conversationId: number): Promise<Conversation> => {
    const response = await api.get(`/messagerie/conversations/${conversationId}`)
    return response.data
  },

  getMessages: async (conversationId: number): Promise<Message[]> => {
    const response = await api.get('/messagerie/messages', { 
      params: { conversation_id: conversationId } 
    })
    return response.data
  },

  createConversation: async (data: ConversationCreateData): Promise<Conversation> => {
    const response = await api.post('/messagerie/conversations', data)
    return response.data
  },

  sendMessage: async (data: MessageCreateData): Promise<Message> => {
    const response = await api.post('/messagerie/messages', data)
    return response.data
  },

  uploadMessageFile: async (file: File): Promise<{ id: number; nom_stockage: string; url_stockage: string }> => {
    const formData = new FormData()
    formData.append('fichier', file)
    formData.append('type_fichier', 'message')
    formData.append('categorie_proprietaire', 'MESSAGE')
    formData.append('proprietaire_id', '0')

    const response = await api.post('/fichiers/upload', formData)
    return response.data
  },

  searchUsers: async (query: string): Promise<RechercheUtilisateurResult[]> => {
    const response = await api.get('/messagerie/utilisateurs/recherche', { 
      params: { q: query } 
    })
    return response.data
  },

  getSuggestedContacts: async (): Promise<RechercheUtilisateurResult[]> => {
    const response = await api.get('/messagerie/utilisateurs/contacts')
    return response.data
  },

  markMessageRead: async (messageId: number): Promise<void> => {
    await api.get(`/messagerie/messages/${messageId}/lu`)
  }
}
// pages/DashboardAdmin.tsx - Version corrigée avec gestion du token et photos
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import Skeleton from '@/components/Skeleton'
import { 
  Shield, Users, Building2, Briefcase, TrendingUp, Settings, 
  RefreshCw, Cpu, Plus, List, FileText, X, Trash2, Database, 
  Eye, Edit, BarChart, Activity, Calendar, Clock, UserPlus,
  UserCheck, UserX, CheckCircle, AlertCircle, Download, Filter,
  Search, ChevronDown, ChevronUp, MoreVertical, ChevronRight,
  Mail, Phone, MapPin, CalendarDays, User as UserIcon, Award,
  GraduationCap, FileCheck, ShieldCheck, Zap, Globe, Link,
  Star, Heart, MessageCircle, Bell, PieChart, TrendingDown,
  Loader2
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { adminService, Statistiques, Utilisateur, OntologyStatus } from '@/services/adminService'
import { useNotificationStore } from '@/store/useStore'
import { useAuthStore } from '@/store/useStore'
// ⭐ IMPORTER getToken DEPUIS api.ts
import { getToken } from '@/services/api'

// ⭐ COMPOSANT PHOTO AVEC FALLBACK - CORRIGÉ AVEC getToken()
const UserPhoto = ({ 
  userId, 
  email,
  role,
  size = 'w-12 h-12',
  className = ''
}: { 
  userId: number
  email: string
  role: string
  size?: string
  className?: string
}) => {
  const [photoError, setPhotoError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  
  useEffect(() => {
    let isMounted = true
    let objectUrl: string | null = null
    
    const fetchPhoto = async () => {
      const token = getToken()
      
      if (!token) {
        if (isMounted) {
          setPhotoError(true)
          setLoading(false)
        }
        return
      }
      
      try {
        const response = await fetch(`/api/candidats/${userId}/photo?t=${Date.now()}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (isMounted) {
          if (response.ok) {
            const blob = await response.blob()
            if (blob.type.startsWith('image/')) {
              objectUrl = URL.createObjectURL(blob)
              setPhotoUrl(objectUrl)
              setPhotoError(false)
            } else {
              setPhotoError(true)
            }
          } else {
            setPhotoError(true)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('❌ Erreur chargement photo:', error)
        if (isMounted) {
          setPhotoError(true)
          setLoading(false)
        }
      }
    }
    
    fetchPhoto()
    
    return () => {
      isMounted = false
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
      if (photoUrl) {
        URL.revokeObjectURL(photoUrl)
      }
    }
  }, [userId])
  
  if (loading) {
    return (
      <div className={`${size} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 animate-pulse ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    )
  }
  
  if (photoError || !photoUrl) {
    const colors = {
      admin: 'bg-gradient-to-br from-red-500 to-red-600',
      entreprise: 'bg-gradient-to-br from-purple-500 to-purple-600',
      candidat: 'bg-gradient-to-br from-blue-500 to-blue-600'
    }
    const color = colors[role as keyof typeof colors] || 'bg-gradient-to-br from-gray-500 to-gray-600'
    
    return (
      <div className={`${size} rounded-full ${color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${className}`}>
        {email?.charAt(0)?.toUpperCase() || 'U'}
      </div>
    )
  }
  
  return (
    <img
      src={photoUrl}
      alt={email}
      className={`${size} rounded-full object-cover flex-shrink-0 border-2 border-primary-500/30 ${className}`}
      loading="lazy"
      onError={() => {
        setPhotoError(true)
        if (photoUrl) {
          URL.revokeObjectURL(photoUrl)
        }
      }}
    />
  )
}

const DashboardAdmin = () => {
  const [statistiques, setStatistiques] = useState<Statistiques | null>(null)
  const [ontologyStats, setOntologyStats] = useState<OntologyStatus | null>(null)
  const [utilisateursRecents, setUtilisateursRecents] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(true)
  const [resyncing, setResyncing] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const { afficherNotification } = useNotificationStore()
  const { token, estConnecte, logout } = useAuthStore()

  // États pour la création
  const [showPosteForm, setShowPosteForm] = useState(false)
  const [showContratForm, setShowContratForm] = useState(false)
  const [showCompetenceForm, setShowCompetenceForm] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // États pour la gestion des données
  const [showGestionData, setShowGestionData] = useState(false)
  const [listePostes, setListePostes] = useState<any[]>([])
  const [listeContrats, setListeContrats] = useState<any[]>([])
  const [listeCompetences, setListeCompetences] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTab, setSelectedTab] = useState('postes')

  // États pour les modals utilisateur
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [userToDelete, setUserToDelete] = useState<number | null>(null)

  // Formulaires
  const [newPoste, setNewPoste] = useState({ titre: '', categorie: 'autre' })
  const [newContrat, setNewContrat] = useState({ type_contrat: 'cdi' })
  const [newCompetence, setNewCompetence] = useState({ nom: '', categorie: 'programmation' })

  // ⭐ FONCTION POUR VÉRIFIER LE TOKEN
  const verifyToken = (): boolean => {
    const currentToken = getToken()
    if (!currentToken) {
      afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
      logout()
      setTimeout(() => {
        window.location.href = '/connexion'
      }, 500)
      return false
    }
    return true
  }

  // ⭐ VÉRIFIER SI L'UTILISATEUR EST ADMIN
  const checkAdminAccess = (): boolean => {
    const store = useAuthStore.getState()
    if (!store.estConnecte || store.utilisateur?.role !== 'admin') {
      afficherNotification('Accès réservé aux administrateurs', 'error')
      setTimeout(() => {
        window.location.href = '/'
      }, 500)
      return false
    }
    return true
  }

  useEffect(() => {
    if (!checkAdminAccess()) return
    if (!verifyToken()) return
    fetchData()
  }, [])

  const fetchData = async () => {
    if (!verifyToken()) return

    setLoading(true)
    try {
      console.log('🔄 Début fetchData Admin...')
      
      // 1. Récupérer les statistiques
      try {
        const statsData = await adminService.getStatistiques()
        setStatistiques(statsData)
      } catch (error: any) {
        console.error('❌ Erreur statistiques:', error)
        if (error.response?.status === 401) {
          afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
          logout()
          window.location.href = '/connexion'
          return
        }
      }
      
      // 2. Récupérer les utilisateurs récents
      try {
        const users = await adminService.getUtilisateursRecents(10)
        const usersList = Array.isArray(users)
          ? users
          : ((users as any)?.utilisateurs ?? [])
        setUtilisateursRecents(usersList)
      } catch (error: any) {
        console.error('❌ Erreur utilisateurs:', error)
        if (error.response?.status === 401) {
          afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
          logout()
          window.location.href = '/connexion'
          return
        }
        setUtilisateursRecents([])
      }
      
      // 3. Récupérer le statut de l'ontologie
      try {
        const ontologyData = await adminService.getOntologyStatus()
        setOntologyStats(ontologyData)
      } catch (e) {
        console.log('⚠️ Ontologie non disponible')
        setOntologyStats(null)
      }
    } catch (error) {
      console.error('❌ Erreur globale fetchData:', error)
      afficherNotification('Erreur lors du chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleResyncOntology = async () => {
    if (!verifyToken()) return

    setResyncing(true)
    try {
      const result = await adminService.resyncOntology()
      setOntologyStats(result.stats)
      afficherNotification('Ontologie OWL resynchronisée avec succès depuis MySQL !', 'success')
    } catch (error) {
      afficherNotification('Erreur lors de la resynchronisation OWL', 'error')
    } finally {
      setResyncing(false)
    }
  }

  const chargerListes = async () => {
    if (!verifyToken()) return

    setLoadingData(true)
    try {
      const currentToken = getToken()
      if (!currentToken) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        logout()
        window.location.href = '/connexion'
        return
      }
      
      const headers = { 'Authorization': `Bearer ${currentToken}` }
      
      const [postesRes, contratsRes, competencesRes] = await Promise.all([
        fetch('/api/postes/', { headers }),
        fetch('/api/contrats/', { headers }),
        fetch('/api/competences/', { headers })
      ])
      
      if (postesRes.ok) setListePostes(await postesRes.json())
      if (contratsRes.ok) setListeContrats(await contratsRes.json())
      if (competencesRes.ok) setListeCompetences(await competencesRes.json())
    } catch (error) {
      console.error('Erreur chargement listes:', error)
      afficherNotification('Erreur lors du chargement des données', 'error')
    } finally {
      setLoadingData(false)
    }
  }

  const handleCreatePoste = async () => {
    if (!verifyToken()) return

    setIsCreating(true)
    try {
      const currentToken = getToken()
      const response = await fetch('/api/postes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(newPoste)
      })
      const data = await response.json()
      if (response.ok) {
        afficherNotification(`Poste "${newPoste.titre}" créé avec succès !`, 'success')
        setNewPoste({ titre: '', categorie: 'autre' })
        setShowPosteForm(false)
        await Promise.all([fetchData(), chargerListes()])
      } else {
        afficherNotification(data.detail || 'Erreur lors de la création', 'error')
      }
    } catch (error) {
      afficherNotification('Erreur lors de la création', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateContrat = async () => {
    if (!verifyToken()) return

    setIsCreating(true)
    try {
      const currentToken = getToken()
      const response = await fetch('/api/contrats/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(newContrat)
      })
      const data = await response.json()
      if (response.ok) {
        afficherNotification(`Contrat "${newContrat.type_contrat.toUpperCase()}" créé avec succès !`, 'success')
        setNewContrat({ type_contrat: 'cdi' })
        setShowContratForm(false)
        await Promise.all([fetchData(), chargerListes()])
      } else {
        afficherNotification(data.detail || 'Erreur lors de la création', 'error')
      }
    } catch (error) {
      afficherNotification('Erreur lors de la création', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateCompetence = async () => {
    if (!verifyToken()) return

    setIsCreating(true)
    try {
      const currentToken = getToken()
      const response = await fetch('/api/competences/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`
        },
        body: JSON.stringify(newCompetence)
      })
      const data = await response.json()
      if (response.ok) {
        afficherNotification(`Compétence "${newCompetence.nom}" créée avec succès !`, 'success')
        setNewCompetence({ nom: '', categorie: 'programmation' })
        setShowCompetenceForm(false)
        await Promise.all([fetchData(), chargerListes()])
      } else {
        afficherNotification(data.detail || 'Erreur lors de la création', 'error')
      }
    } catch (error) {
      afficherNotification('Erreur lors de la création', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const supprimerPoste = async (id: number) => {
    if (!verifyToken()) return
    if (!confirm('Supprimer ce poste ?')) return
    
    try {
      const currentToken = getToken()
      const res = await fetch(`/api/postes/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentToken}` }
      })
      if (res.ok) {
        afficherNotification('Poste supprimé avec succès !', 'success')
        await Promise.all([fetchData(), chargerListes()])
      } else {
        const err = await res.json()
        afficherNotification(err.detail || 'Erreur suppression', 'error')
      }
    } catch (error) {
      afficherNotification('Erreur lors de la suppression', 'error')
    }
  }

  const supprimerContrat = async (id: number) => {
    if (!verifyToken()) return
    if (!confirm('Supprimer ce contrat ?')) return
    
    try {
      const currentToken = getToken()
      const res = await fetch(`/api/contrats/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentToken}` }
      })
      if (res.ok) {
        afficherNotification('Contrat supprimé avec succès !', 'success')
        await Promise.all([fetchData(), chargerListes()])
      } else {
        const err = await res.json()
        afficherNotification(err.detail || 'Erreur suppression', 'error')
      }
    } catch (error) {
      afficherNotification('Erreur lors de la suppression', 'error')
    }
  }

  const supprimerCompetence = async (id: number) => {
    if (!verifyToken()) return
    if (!confirm('Supprimer cette compétence ?')) return
    
    try {
      const currentToken = getToken()
      const res = await fetch(`/api/competences/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentToken}` }
      })
      if (res.ok) {
        afficherNotification('Compétence supprimée avec succès !', 'success')
        await Promise.all([fetchData(), chargerListes()])
      } else {
        const err = await res.json()
        afficherNotification(err.detail || 'Erreur suppression', 'error')
      }
    } catch (error) {
      afficherNotification('Erreur lors de la suppression', 'error')
    }
  }

  const handleViewUser = (user: Utilisateur) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleToggleStatus = async (userId: number, currentStatus: boolean) => {
    if (!verifyToken()) return
    if (actionLoading) return
    
    setActionLoading(true)
    try {
      const currentToken = getToken()
      const endpoint = currentStatus ? 'desactiver' : 'activer'
      console.log(`🔄 ${endpoint} utilisateur ${userId}`)
      
      const response = await fetch(`/api/admin/utilisateurs/${userId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const message = currentStatus ? 'Utilisateur désactivé avec succès' : 'Utilisateur activé avec succès'
        afficherNotification(message, 'success')
        await fetchData()
      } else {
        let errorMessage = 'Erreur lors du changement de statut'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          console.error('Erreur parsing réponse:', e)
        }
        afficherNotification(errorMessage, 'error')
        console.error('❌ Erreur toggle status:', response.status)
      }
    } catch (error) {
      console.error('❌ Erreur handleToggleStatus:', error)
      afficherNotification('Erreur réseau lors du changement de statut', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteUser = async (userId: number) => {
    if (!verifyToken()) return
    if (actionLoading) return
    
    setActionLoading(true)
    try {
      const currentToken = getToken()
      const response = await fetch(`/api/admin/utilisateurs/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        afficherNotification('Utilisateur supprimé avec succès', 'success')
        setShowDeleteConfirm(false)
        setUserToDelete(null)
        await fetchData()
      } else {
        let errorMessage = 'Erreur lors de la suppression'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          console.error('Erreur parsing réponse:', e)
        }
        afficherNotification(errorMessage, 'error')
        console.error('❌ Erreur delete:', response.status)
      }
    } catch (error) {
      console.error('❌ Erreur handleDeleteUser:', error)
      afficherNotification('Erreur réseau lors de la suppression', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, { label: string; couleur: string; icon: any }> = {
      candidat: { label: "Candidat", couleur: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: UserIcon },
      entreprise: { label: "Entreprise", couleur: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400", icon: Building2 },
      admin: { label: "Admin", couleur: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: Shield }
    }
    return labels[role] || { label: role, couleur: "bg-gray-100 text-gray-800", icon: UserIcon }
  }

  const filteredPostes = listePostes.filter(p => 
    p.titre?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredContrats = listeContrats.filter(c => 
    c.type_contrat?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const filteredCompetences = listeCompetences.filter(c => 
    c.nom?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ⭐ SI L'UTILISATEUR N'EST PAS ADMIN
  if (!estConnecte || (useAuthStore.getState().utilisateur?.role !== 'admin')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-12 text-center max-w-md">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Accès réservé aux administrateurs
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Vous devez être administrateur pour accéder à cette page.
          </p>
          <button onClick={() => window.location.href = '/'} className="glass-button">
            Retour à l'accueil
          </button>
        </GlassCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary-500" />
            Dashboard Administrateur
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gérez la plateforme et supervisez l'activité en temps réel
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fetchData()}
            className="glass-button flex items-center gap-2 text-sm py-2 px-4"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </button>
          <button
            onClick={handleResyncOntology}
            disabled={resyncing}
            className="glass-button flex items-center gap-2 text-sm py-2 px-4"
          >
            <RefreshCw className={`w-4 h-4 ${resyncing ? 'animate-spin' : ''}`} />
            {resyncing ? 'Resynchronisation...' : 'Resync OWL'}
          </button>
          <button 
            onClick={() => {
              chargerListes()
              setShowGestionData(!showGestionData)
            }}
            className="glass-button flex items-center gap-2 text-sm py-2 px-4 bg-green-500/80 hover:bg-green-600/80"
          >
            <Database className="w-4 h-4" />
            {showGestionData ? 'Masquer Données' : 'Gérer Données'}
          </button>
          <button className="glass-button flex items-center gap-2 text-sm py-2 px-4 bg-blue-500/80 hover:bg-blue-600/80">
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </motion.div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { icone: <Users className="w-6 h-6" />, label: "Utilisateurs", valeur: statistiques?.total_utilisateurs || 0, couleur: "from-blue-500 to-cyan-500" },
          { icone: <UserIcon className="w-6 h-6" />, label: "Candidats", valeur: statistiques?.total_candidats || 0, couleur: "from-green-500 to-emerald-500" },
          { icone: <Building2 className="w-6 h-6" />, label: "Entreprises", valeur: statistiques?.total_entreprises || 0, couleur: "from-purple-500 to-pink-500" },
          { icone: <Briefcase className="w-6 h-6" />, label: "Offres", valeur: statistiques?.total_offres || 0, couleur: "from-orange-500 to-red-500" },
          { icone: <TrendingUp className="w-6 h-6" />, label: "Candidatures", valeur: statistiques?.total_candidatures || 0, couleur: "from-indigo-500 to-purple-500" },
          { icone: <Settings className="w-6 h-6" />, label: "Compétences", valeur: statistiques?.total_competences || 0, couleur: "from-teal-500 to-green-500" }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard className="p-4 hover:scale-105 transition-transform cursor-pointer">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.couleur} flex items-center justify-center text-white mb-2`}>
                {stat.icone}
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{stat.valeur}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Section Admin - Gestion des référentiels */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-500" />
              Gestion des référentiels
            </h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher..."
                  className="glass-input pl-9 py-1.5 text-sm w-40"
                />
              </div>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            {/* Postes */}
            <div className="space-y-2">
              <button
                onClick={() => setShowPosteForm(!showPosteForm)}
                className="w-full px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <Briefcase className="w-4 h-4" />
                {showPosteForm ? 'Fermer' : 'Ajouter un poste'}
                <span className="text-xs bg-blue-500/20 px-2 py-0.5 rounded-full">{listePostes.length}</span>
              </button>
              {showPosteForm && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
                  <input
                    type="text"
                    value={newPoste.titre}
                    onChange={(e) => setNewPoste({ ...newPoste, titre: e.target.value })}
                    placeholder="Nom du poste"
                    className="glass-input w-full"
                  />
                  <select
                    value={newPoste.categorie}
                    onChange={(e) => setNewPoste({ ...newPoste, categorie: e.target.value })}
                    className="glass-input w-full"
                  >
                    <option value="developpeur">Développeur</option>
                    <option value="manager">Manager</option>
                    <option value="comptable">Comptable</option>
                    <option value="autre">Autre</option>
                  </select>
                  <button
                    onClick={handleCreatePoste}
                    disabled={isCreating || !newPoste.titre}
                    className="w-full glass-button disabled:opacity-50"
                  >
                    {isCreating ? 'Création...' : 'Créer le poste'}
                  </button>
                </div>
              )}
            </div>

            {/* Contrats */}
            <div className="space-y-2">
              <button
                onClick={() => setShowContratForm(!showContratForm)}
                className="w-full px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <FileText className="w-4 h-4" />
                {showContratForm ? 'Fermer' : 'Ajouter un contrat'}
                <span className="text-xs bg-green-500/20 px-2 py-0.5 rounded-full">{listeContrats.length}</span>
              </button>
              {showContratForm && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
                  <select
                    value={newContrat.type_contrat}
                    onChange={(e) => setNewContrat({ type_contrat: e.target.value })}
                    className="glass-input w-full"
                  >
                    <option value="cdi">CDI</option>
                    <option value="cdd">CDD</option>
                    <option value="stage">Stage</option>
                    <option value="alternance">Alternance</option>
                    <option value="freelance">Freelance</option>
                  </select>
                  <button
                    onClick={handleCreateContrat}
                    disabled={isCreating}
                    className="w-full glass-button disabled:opacity-50"
                  >
                    {isCreating ? 'Création...' : 'Créer le contrat'}
                  </button>
                </div>
              )}
            </div>

            {/* Compétences */}
            <div className="space-y-2">
              <button
                onClick={() => setShowCompetenceForm(!showCompetenceForm)}
                className="w-full px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center gap-2 transition-all"
              >
                <List className="w-4 h-4" />
                {showCompetenceForm ? 'Fermer' : 'Ajouter une compétence'}
                <span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded-full">{listeCompetences.length}</span>
              </button>
              {showCompetenceForm && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl space-y-2">
                  <input
                    type="text"
                    value={newCompetence.nom}
                    onChange={(e) => setNewCompetence({ ...newCompetence, nom: e.target.value })}
                    placeholder="Nom de la compétence"
                    className="glass-input w-full"
                  />
                  <select
                    value={newCompetence.categorie}
                    onChange={(e) => setNewCompetence({ ...newCompetence, categorie: e.target.value })}
                    className="glass-input w-full"
                  >
                    <option value="programmation">Programmation</option>
                    <option value="base_de_donnees">Base de données</option>
                    <option value="developpement_web">Développement Web</option>
                    <option value="web_semantique">Web Sémantique</option>
                    <option value="autre">Autre</option>
                  </select>
                  <button
                    onClick={handleCreateCompetence}
                    disabled={isCreating || !newCompetence.nom}
                    className="w-full glass-button disabled:opacity-50"
                  >
                    {isCreating ? 'Création...' : 'Créer la compétence'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Section Affichage des données */}
      {showGestionData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-500" />
                Données en base
                <span className="text-sm font-normal text-gray-500">
                  ({listePostes.length + listeContrats.length + listeCompetences.length} éléments)
                </span>
              </h2>
              <div className="flex gap-2">
                {['postes', 'contrats', 'competences'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                      selectedTab === tab
                        ? 'bg-primary-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {loadingData ? (
              <div className="text-center py-8">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-2 text-gray-500">Chargement...</p>
              </div>
            ) : (
              <div className="max-h-96 overflow-y-auto">
                {selectedTab === 'postes' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredPostes.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span className="truncate">{item.titre}</span>
                        <button
                          onClick={() => supprimerPoste(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedTab === 'contrats' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredContrats.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <span>{item.type_contrat.toUpperCase()}</span>
                        <button
                          onClick={() => supprimerContrat(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {selectedTab === 'competences' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredCompetences.map((item) => (
                      <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="truncate">{item.nom}</span>
                          <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-gray-600 dark:text-gray-300">
                            {item.categorie}
                          </span>
                        </div>
                        <button
                          onClick={() => supprimerCompetence(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* Panneau Ontologie OWL */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
              <Cpu className="w-6 h-6 text-purple-500" />
              Ontologie OWL Sémantique
            </h2>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 rounded-full text-xs font-semibold flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Temps réel
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 dark:border-purple-800/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">Triples RDF</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{ontologyStats?.total_triples || 0}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">Individus OWL</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{ontologyStats?.total_individuals || 0}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">Candidats</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{ontologyStats?.total_candidats || 0}</p>
            </div>
            <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-200 dark:border-orange-800/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">Entreprises</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{ontologyStats?.total_entreprises || 0}</p>
            </div>
            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl border border-teal-200 dark:border-teal-800/30">
              <p className="text-xs text-gray-500 dark:text-gray-400">Compétences OWL</p>
              <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{ontologyStats?.total_competences || 0}</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* ⭐ UTILISATEURS AVEC PHOTOS ET ACTIONS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-500" />
            Utilisateurs récents
            <span className="text-sm font-normal text-gray-500">
              ({utilisateursRecents.length})
            </span>
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {utilisateursRecents && utilisateursRecents.length > 0 ? (
            utilisateursRecents.map((utilisateur, index) => {
              const role = getRoleLabel(utilisateur.role)
              const RoleIcon = role.icon
              
              return (
                <motion.div
                  key={utilisateur.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <GlassCard className="p-4 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Avatar avec photo - Utilisation du composant UserPhoto */}
                        <div className="relative">
                          <UserPhoto 
                            userId={utilisateur.id}
                            email={utilisateur.email}
                            role={utilisateur.role}
                            size="w-12 h-12"
                          />
                          <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                            utilisateur.actif ? 'bg-green-500' : 'bg-red-500'
                          }`} />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {utilisateur.email}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${role.couleur}`}>
                              <RoleIcon className="w-3 h-3" />
                              {role.label}
                            </span>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              utilisateur.actif 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {utilisateur.actif ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <AlertCircle className="w-3 h-3" />
                              )}
                              {utilisateur.actif ? 'Actif' : 'Inactif'}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(utilisateur.date_creation).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={() => handleViewUser(utilisateur)}
                          className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Voir les détails"
                          disabled={actionLoading}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(utilisateur.id, utilisateur.actif)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            utilisateur.actif 
                              ? 'text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20' 
                              : 'text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                          title={utilisateur.actif ? 'Désactiver' : 'Activer'}
                          disabled={actionLoading}
                        >
                          {utilisateur.actif ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setUserToDelete(utilisateur.id)
                            setShowDeleteConfirm(true)
                          }}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Supprimer"
                          disabled={actionLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })
          ) : (
            <GlassCard className="p-8 text-center col-span-2">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Aucun utilisateur trouvé</p>
              <p className="text-sm text-gray-400 mt-2">Vérifiez que des utilisateurs sont inscrits sur la plateforme</p>
            </GlassCard>
          )}
        </div>
      </motion.div>

      {/* ⭐ MODAL VOIR UTILISATEUR AVEC PHOTO */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Détails de l'utilisateur
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <UserPhoto 
                    userId={selectedUser.id}
                    email={selectedUser.email}
                    role={selectedUser.role}
                    size="w-16 h-16"
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                      {selectedUser.email}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleLabel(selectedUser.role).couleur}`}>
                        {getRoleLabel(selectedUser.role).label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        selectedUser.actif 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {selectedUser.actif ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">ID</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">#{selectedUser.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Date d'inscription</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200">
                      {new Date(selectedUser.date_creation).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Rôle</p>
                    <p className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                      {selectedUser.role}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-3">
                  <button
                    onClick={() => {
                      handleToggleStatus(selectedUser.id, selectedUser.actif)
                      setShowUserModal(false)
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-medium transition-colors ${
                      selectedUser.actif 
                        ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20' 
                        : 'bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/20'
                    }`}
                    disabled={actionLoading}
                  >
                    {selectedUser.actif ? 'Désactiver' : 'Activer'}
                  </button>
                  <button
                    onClick={() => {
                      setUserToDelete(selectedUser.id)
                      setShowUserModal(false)
                      setShowDeleteConfirm(true)
                    }}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20 font-medium transition-colors"
                    disabled={actionLoading}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* ⭐ MODAL SUPPRIMER UTILISATEUR */}
      {showDeleteConfirm && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md"
          >
            <GlassCard className="p-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                  Confirmer la suppression
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mt-2">
                  Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setUserToDelete(null)
                  }}
                  className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  disabled={actionLoading}
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteUser(userToDelete)}
                  className="flex-1 py-3 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Suppression...' : 'Supprimer'}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </div>
  )
}

export default DashboardAdmin
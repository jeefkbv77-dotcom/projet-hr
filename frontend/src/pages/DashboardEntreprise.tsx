// pages/DashboardEntreprise.tsx
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import Skeleton from '@/components/Skeleton'
import { 
  Building2, Briefcase, Users, TrendingUp, Plus, Camera, Upload, X, Save,
  Eye, Edit, Trash2, Search, Filter, Clock, CheckCircle, AlertCircle,
  BarChart, PieChart, Activity, Calendar, Download, Printer, Share2,
  Star, Heart, MessageCircle, Bell, Settings, UserPlus, FileText,
  Award, GraduationCap, Mail, Phone, MapPin, User, ExternalLink,
  ChevronRight, ChevronDown, ChevronUp, MoreVertical, RefreshCw,
  File, Send, MessageSquare, Target, Zap, ArrowRight, Loader2,
  File as FileIcon, Mail as MailIcon, Check, X as XIcon, UserCheck,
  UserX, Calendar as CalendarIcon, Clock as ClockIcon
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { entrepriseService, Entreprise, Offre } from '@/services/entrepriseService'
import { offreService } from '@/services/offreService'
import { useNotificationStore } from '@/store/useStore'
import { useAuthStore } from '@/store/useStore'
import { candidatureService } from '@/services/candidatureService'
import { candidatService } from '@/services/candidatService'
import { Link, useNavigate } from 'react-router-dom'
// ⭐ IMPORTS DEPUIS api.ts
import { getToken, getCandidatPhotoUrl, getEntrepriseLogoUrl } from '@/services/api'

// Composant Skeleton fallback
const SkeletonLoader = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
)

// ⭐ Helper robuste pour normaliser la réponse des départements
const normaliserListe = (data: any): any[] => {
  if (Array.isArray(data)) return data
  if (!data) return []
  return data.departements || data.data || data.items || data.results || []
}

const DashboardEntreprise = () => {
  const { utilisateur, estConnecte } = useAuthStore()
  const navigate = useNavigate()
  const { afficherNotification } = useNotificationStore()
  
  // ⭐ PROTECTION DE RÔLE - UNIQUEMENT ENTREPRISES
  useEffect(() => {
    if (!estConnecte) {
      afficherNotification('Veuillez vous connecter pour accéder à cette page', 'error')
      navigate('/connexion')
      return
    }
    
    if (utilisateur && utilisateur.role !== 'entreprise' && utilisateur.role !== 'admin') {
      afficherNotification('Accès réservé aux entreprises', 'error')
      navigate('/dashboard/candidat')
    }
  }, [utilisateur, estConnecte, navigate, afficherNotification])

  const [entreprise, setEntreprise] = useState<Entreprise | null>(null)
  const [offres, setOffres] = useState<Offre[]>([])
  const [candidaturesRecentes, setCandidaturesRecentes] = useState<any[]>([])
  const [candidatsRecommandes, setCandidatsRecommandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRecommandations, setLoadingRecommandations] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // ⭐ État pour forcer le rafraîchissement du logo après upload
  const [imageVersion, setImageVersion] = useState(0)
  
  // États pour les modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [showOffreDetails, setShowOffreDetails] = useState(false)
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null)
  const [editingOffreId, setEditingOffreId] = useState<number | null>(null)
  const [showCandidaturesOffre, setShowCandidaturesOffre] = useState(false)
  const [candidaturesOffre, setCandidaturesOffre] = useState<any[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; offreId: number | null }>({ show: false, offreId: null })
  const [deleting, setDeleting] = useState(false)
  
  // États pour la visualisation du candidat
  const [showCandidatModal, setShowCandidatModal] = useState(false)
  const [candidatDetail, setCandidatDetail] = useState<any>(null)
  const [loadingCandidat, setLoadingCandidat] = useState(false)
  
  // ⭐ États pour CV et lettre de motivation
  const [showCVModal, setShowCVModal] = useState(false)
  const [cvUrl, setCvUrl] = useState<string | null>(null)
  const [showLMModal, setShowLMModal] = useState(false)
  const [lmUrl, setLmUrl] = useState<string | null>(null)

  // États pour l'embauche
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [selectedCandidature, setSelectedCandidature] = useState<any>(null)
  const [conversionLoading, setConversionLoading] = useState(false)
  // ⭐ État de chargement des listes du modal d'embauche
  const [loadingConversionData, setLoadingConversionData] = useState(false)
  
  // États pour les listes déroulantes
  const [postes, setPostes] = useState<{ id: number; titre: string }[]>([])
  const [contrats, setContrats] = useState<{ id: number; type_contrat: string }[]>([])
  const [competences, setCompetences] = useState<{ id: number; nom: string; categorie: string }[]>([])
  const [departements, setDepartements] = useState<{ id: number; nom: string }[]>([])
  
  const [formData, setFormData] = useState({
    titre: '',
    description: '',
    poste_id: 0,
    contrat_id: 0,
    localisation: '',
    salaire_min: '',
    salaire_max: '',
    date_expiration: '',
    competence_ids: [] as number[]
  })

  // Données pour l'embauche
  const [convertData, setConvertData] = useState({
    poste_id: 0,
    departement_id: 0,
    contrat_id: 0,
    date_embauche: '',
    titre_poste: ''
  })

  // Statistiques avancées
  const [statsPeriode, setStatsPeriode] = useState<'semaine' | 'mois' | 'annee'>('mois')
  const [statsData, setStatsData] = useState({
    totalCandidatures: 0,
    tauxAcceptation: 0,
    tauxRefus: 0,
    candidaturesParOffre: {} as Record<string, number>
  })

  // ⭐ FONCTION POUR VÉRIFIER LE TOKEN
  const verifyToken = (): boolean => {
    const token = getToken()
    if (!token) {
      afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
      navigate('/connexion')
      return false
    }
    return true
  }

  const fetchData = async () => {
    if (!verifyToken()) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      console.log('🏢 Chargement des données entreprise...')
      
      // 1. Récupérer les informations de l'entreprise
      const entrepriseData = await entrepriseService.getMonEntreprise()
      setEntreprise(entrepriseData)
      
      // 2. Récupérer les offres de l'entreprise
      try {
        const offresData = await entrepriseService.getMesOffres()
        setOffres(offresData)
        console.log(`📊 ${offresData.length} offres récupérées`)
      } catch (error) {
        console.error('❌ Erreur chargement offres:', error)
        setOffres([])
      }
      
      // 3. Récupérer les candidatures
      try {
        const candidatures = await candidatureService.getMesCandidatures()
        setCandidaturesRecentes(candidatures.slice(0, 5))
        
        const totalCandidatures = candidatures.length
        const acceptees = candidatures.filter((c: any) => c.statut === 'ACCEPTEE').length
        const refusees = candidatures.filter((c: any) => c.statut === 'REFUSEE').length
        
        const candidaturesParOffre = candidatures.reduce((acc: any, c: any) => {
          const key = c.offre_titre || 'Offre sans titre'
          acc[key] = (acc[key] || 0) + 1
          return acc
        }, {})
        
        setStatsData({
          totalCandidatures,
          tauxAcceptation: totalCandidatures > 0 ? Math.round((acceptees / totalCandidatures) * 100) : 0,
          tauxRefus: totalCandidatures > 0 ? Math.round((refusees / totalCandidatures) * 100) : 0,
          candidaturesParOffre
        })
      } catch (error) {
        console.error('❌ Erreur chargement candidatures:', error)
        setCandidaturesRecentes([])
      }
      
      // 4. Charger les candidats recommandés
      await chargerCandidatsRecommandes()
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error)
      afficherNotification('Erreur lors du chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }

  // ⭐ CHARGER LES CANDIDATS RECOMMANDÉS
  const chargerCandidatsRecommandes = async () => {
    setLoadingRecommandations(true)
    try {
      if (offres.length === 0) {
        setCandidatsRecommandes([])
        return
      }
      
      const token = getToken()
      if (!token) {
        console.warn('⚠️ Pas de token pour les recommandations')
        setCandidatsRecommandes([])
        return
      }
      
      // Récupérer les candidats recommandés pour chaque offre
      const offresAvecCandidatures = await Promise.all(
        offres.slice(0, 3).map(async (offre) => {
          try {
            const response = await fetch(
              `/api/offres/${offre.id}/candidats-recommandes?limit=3`,
              {
                headers: { 
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              }
            )
            
            if (response.status === 401) {
              console.warn(`⚠️ Non autorisé pour l'offre ${offre.id}`)
              return { offre, candidats: [] }
            }
            
            if (response.ok) {
              const data = await response.json()
              return { offre, candidats: data.candidats || [] }
            }
            return { offre, candidats: [] }
          } catch (error) {
            console.error(`❌ Erreur pour l'offre ${offre.id}:`, error)
            return { offre, candidats: [] }
          }
        })
      )
      
      // Collecter tous les candidats recommandés
      const allCandidats = offresAvecCandidatures.flatMap(item => 
        item.candidats.map((c: any) => ({ ...c, offre_titre: item.offre.titre }))
      )
      
      // Trier par score et prendre les 5 meilleurs
      const topCandidats = allCandidats
        .sort((a, b) => (b.score_compatibilite || 0) - (a.score_compatibilite || 0))
        .slice(0, 5)
      
      setCandidatsRecommandes(topCandidats)
    } catch (error) {
      console.error('❌ Erreur chargement candidats recommandés:', error)
      setCandidatsRecommandes([])
    } finally {
      setLoadingRecommandations(false)
    }
  }

  useEffect(() => {
    if (estConnecte && utilisateur && (utilisateur.role === 'entreprise' || utilisateur.role === 'admin')) {
      fetchData()
    }
  }, [estConnecte, utilisateur])

  useEffect(() => {
    if (offres.length > 0) {
      chargerCandidatsRecommandes()
    }
  }, [offres])

  // ⭐ VOIR LE CV D'UN CANDIDAT
  const voirCV = (candidatId: number) => {
    if (!verifyToken()) return
    
    const token = getToken()
    if (!token) {
      afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
      navigate('/connexion')
      return
    }
    const url = `/api/candidats/${candidatId}/cv?token=${encodeURIComponent(token)}&t=${Date.now()}`
    setCvUrl(url)
    setShowCVModal(true)
  }

  const telechargerDocument = async (url: string, nom: string) => {
    try {
      const token = getToken()
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const extension = blob.type.includes('pdf') ? 'pdf' : blob.type.includes('wordprocessingml') ? 'docx' : blob.type.includes('msword') ? 'doc' : 'bin'
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `${nom}.${extension}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      console.error('Erreur téléchargement document:', error)
      afficherNotification('Impossible de télécharger le document', 'error')
    }
  }

  // ⭐ VOIR LA LETTRE DE MOTIVATION
  const voirLettreMotivation = (candidatId: number) => {
    if (!verifyToken()) return
    
    const token = getToken()
    if (!token) {
      afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
      navigate('/connexion')
      return
    }
    const url = `/api/candidats/${candidatId}/lettre-motivation?token=${encodeURIComponent(token)}&t=${Date.now()}`
    setLmUrl(url)
    setShowLMModal(true)
  }

  // ⭐ Fonction utilitaire : charger les départements (robuste)
  const fetchDepartements = async (): Promise<{ id: number; nom: string }[]> => {
    const token = getToken()
    if (!token) return []
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
    
    try {
      let res = await fetch('/api/departements/', { headers })
      if (!res.ok) {
        res = await fetch('/api/departements', { headers })
      }
      if (!res.ok) {
        console.warn('⚠️ Impossible de charger les départements, status:', res.status)
        return []
      }
      const data = await res.json()
      const liste = normaliserListe(data)
      console.log(`✅ ${liste.length} départements chargés`)
      return liste
    } catch (e) {
      console.error('❌ Erreur chargement départements:', e)
      return []
    }
  }

  const loadModalData = async () => {
    try {
      const [postesData, contratsData, competencesData, departementsData] = await Promise.all([
        offreService.getPostes(),
        offreService.getContrats(),
        offreService.getCompetences(),
        fetchDepartements()
      ])
      setPostes(postesData)
      setContrats(contratsData)
      setCompetences(competencesData)
      setDepartements(departementsData)
    } catch (error) {
      console.error('❌ Erreur chargement données modal:', error)
    }
  }

  // ⭐ NOUVEAU : charger uniquement ce qui est nécessaire pour l'embauche
  const loadConversionData = async () => {
    setLoadingConversionData(true)
    try {
      const [postesData, contratsData, departementsData] = await Promise.all([
        offreService.getPostes(),
        offreService.getContrats(),
        fetchDepartements()
      ])
      setPostes(postesData)
      setContrats(contratsData)
      setDepartements(departementsData)
    } catch (error) {
      console.error('❌ Erreur chargement données embauche:', error)
      afficherNotification('Erreur lors du chargement des listes', 'error')
    } finally {
      setLoadingConversionData(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      afficherNotification('Veuillez sélectionner une image de logo valide', 'error')
      return
    }

    setUploadingLogo(true)
    try {
      await entrepriseService.uploadLogo(file)
      afficherNotification('Logo de l\'entreprise mis à jour avec succès', 'success')
      
      // ⭐ On force le rafraîchissement du logo
      setImageVersion(prev => prev + 1)
      
      await fetchData()
    } catch (error) {
      afficherNotification('Erreur lors de l\'envoi du logo', 'error')
    } finally {
      setUploadingLogo(false)
    }
  }

  const openModal = async () => {
    setEditingOffreId(null)
    setIsModalOpen(true)
    await loadModalData()
  }

  const openEditModal = async (offre: Offre) => {
    setEditingOffreId(offre.id)
    setFormData({
      titre: offre.titre,
      description: offre.description || '',
      poste_id: offre.poste_id ?? 0,
      contrat_id: offre.contrat_id ?? 0,
      localisation: offre.localisation || '',
      salaire_min: offre.salaire_min?.toString() || '',
      salaire_max: offre.salaire_max?.toString() || '',
      date_expiration: offre.date_expiration ? offre.date_expiration.slice(0, 10) : '',
      competence_ids: offre.competences?.map(competence => competence.id) || [],
    })
    setIsModalOpen(true)
    await loadModalData()
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingOffreId(null)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      titre: '',
      description: '',
      poste_id: 0,
      contrat_id: 0,
      localisation: '',
      salaire_min: '',
      salaire_max: '',
      date_expiration: '',
      competence_ids: []
    })
  }

  const formatDateForAPI = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined
    try {
      const date = new Date(dateStr + 'T00:00:00')
      if (isNaN(date.getTime())) return undefined
      return date.toISOString()
    } catch {
      return undefined
    }
  }

  // ⭐ PUBLIER UNE OFFRE
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalLoading(true)

    try {
      const dateExpiration = formatDateForAPI(formData.date_expiration)

      const offreData = {
        titre: formData.titre,
        description: formData.description,
        poste_id: Number(formData.poste_id || 0),
        contrat_id: Number(formData.contrat_id || 0),
        localisation: formData.localisation || undefined,
        salaire_min: formData.salaire_min ? parseFloat(formData.salaire_min) : undefined,
        salaire_max: formData.salaire_max ? parseFloat(formData.salaire_max) : undefined,
        date_expiration: dateExpiration,
        competence_ids: formData.competence_ids,
        statut: 'ACTIVE' as const
      }

      if (editingOffreId) {
        await entrepriseService.updateOffre(editingOffreId, offreData)
        afficherNotification('✅ Offre modifiée avec succès !', 'success')
      } else {
        await offreService.createOffre(offreData)
        afficherNotification('✅ Offre publiée avec succès !', 'success')
      }
      closeModal()
      await fetchData()
    } catch (error: any) {
      let message = 'Erreur lors de la publication'
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (Array.isArray(detail)) {
          message = detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ')
        } else if (typeof detail === 'object') {
          message = detail.msg || detail.message || JSON.stringify(detail)
        } else {
          message = String(detail)
        }
      } else if (error.message) {
        message = error.message
      }
      afficherNotification(message, 'error')
    } finally {
      setModalLoading(false)
    }
  }

  // ⭐ SUPPRIMER UNE OFFRE
  const handleDeleteOffre = async (offreId: number) => {
    setDeleting(true)
    try {
      await entrepriseService.deleteOffre(offreId)
      afficherNotification('✅ Offre supprimée avec succès', 'success')
      setDeleteConfirm({ show: false, offreId: null })
      await fetchData()
    } catch (error: any) {
      afficherNotification(error.response?.data?.detail || 'Erreur lors de la suppression', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const toggleCompetence = (id: number) => {
    setFormData(prev => ({
      ...prev,
      competence_ids: prev.competence_ids.includes(id)
        ? prev.competence_ids.filter(cid => cid !== id)
        : [...prev.competence_ids, id]
    }))
  }

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, { label: string; couleur: string }> = {
      ACTIVE: { label: "Active", couleur: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
      BROUILLON: { label: "Brouillon", couleur: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400" },
      COMBLEE: { label: "Comblée", couleur: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
      EXPIREE: { label: "Expirée", couleur: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" }
    }
    return labels[statut] || { label: statut, couleur: "bg-gray-100 text-gray-800" }
  }

  const handleVoirCandidatures = async (offreId: number) => {
    if (!verifyToken()) return
    
    try {
      const data = await candidatureService.getCandidaturesByOffre(offreId)
      setCandidaturesOffre(data)
      setShowCandidaturesOffre(true)
    } catch (error) {
      afficherNotification('Erreur lors du chargement des candidatures', 'error')
    }
  }

  // ⭐ VOIR LE PROFIL COMPLET D'UN CANDIDAT
  const voirCandidatComplet = async (candidatId: number) => {
    if (!verifyToken()) return
    
    setLoadingCandidat(true)
    setShowCandidatModal(true)
    try {
      const token = getToken()
      if (!token) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      
      const response = await fetch(`/api/candidats/${candidatId}/complet`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCandidatDetail(data)
      } else if (response.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
      } else {
        afficherNotification('Erreur lors du chargement du profil', 'error')
      }
    } catch (error) {
      console.error('❌ Erreur chargement profil:', error)
      afficherNotification('Erreur lors du chargement du profil', 'error')
    } finally {
      setLoadingCandidat(false)
    }
  }

  // ⭐ EMBAUCHER UN CANDIDAT
  const handleConvertir = async (candidatureId: number) => {
    if (!verifyToken()) return
    
    if (!convertData.poste_id) {
      afficherNotification('Veuillez sélectionner un poste', 'error')
      return
    }
    if (!convertData.date_embauche) {
      afficherNotification('Veuillez sélectionner une date d\'embauche', 'error')
      return
    }
    if (!convertData.titre_poste) {
      afficherNotification('Veuillez entrer un titre de poste', 'error')
      return
    }

    setConversionLoading(true)
    try {
      await candidatureService.convertirEnEmploye(candidatureId, convertData)
      afficherNotification('✅ Candidat converti en employé avec succès !', 'success')
      
      setShowConvertModal(false)
      setShowCandidatModal(false)
      setSelectedCandidature(null)
      setCandidatDetail(null)
      
      setConvertData({
        poste_id: 0,
        departement_id: 0,
        contrat_id: 0,
        date_embauche: '',
        titre_poste: ''
      })
      
      await fetchData()
    } catch (error: any) {
      console.error('❌ Erreur conversion:', error)
      afficherNotification(error.response?.data?.detail || 'Erreur lors de la conversion', 'error')
    } finally {
      setConversionLoading(false)
    }
  }

  // ⭐ OUVRIR LE MODAL D'EMBAUCHE - chargement des listes garanti
  const ouvrirModalEmbauche = async (candidature: any) => {
    setSelectedCandidature(candidature)
    setConvertData({
      poste_id: 0,
      departement_id: 0,
      contrat_id: 0,
      date_embauche: new Date().toISOString().split('T')[0],
      titre_poste: ''
    })
    setShowConvertModal(true)
    // ⭐ Charger les listes (postes, contrats, départements) à chaque ouverture
    await loadConversionData()
  }

  const getCompatibiliteColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (score >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  const statistiques = {
    offres_publiees: offres.length,
    offres_actives: offres.filter(o => o.statut === 'ACTIVE').length,
    nombre_candidatures: offres.reduce((sum, o) => sum + (o.nombre_candidatures || 0), 0),
    taux_succes: offres.length > 0 ? Math.round((offres.filter(o => o.statut === 'COMBLEE').length / offres.length) * 100) : 0
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonLoader className="h-12 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonLoader key={`skeleton-stat-${i}`} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <SkeletonLoader key={`skeleton-card-${i}`} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ⭐ MODAL CONFIRMATION SUPPRESSION */}
      {deleteConfirm.show && deleteConfirm.offreId && (
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
                  Êtes-vous sûr de vouloir supprimer cette offre ? Cette action est irréversible.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm({ show: false, offreId: null })}
                  className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteOffre(deleteConfirm.offreId!)}
                  disabled={deleting}
                  className="flex-1 py-3 px-6 rounded-xl bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50"
                >
                  {deleting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                      Suppression...
                    </>
                  ) : (
                    'Supprimer'
                  )}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* ⭐ MODAL CV */}
      {showCVModal && cvUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  CV du candidat
                </h2>
                <button
                  onClick={() => {
                    setShowCVModal(false)
                    setCvUrl(null)
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex justify-center gap-3 mb-4">
                <button
                  onClick={() => telechargerDocument(cvUrl, 'cv_candidat')}
                  className="glass-button flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ouvrir dans un nouvel onglet
                </button>
                <button
                  onClick={() => window.open(cvUrl, '_blank')}
                  className="glass-button flex items-center gap-2 bg-green-500/80 hover:bg-green-600/80"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">Le CV est disponible</p>
                  <p className="text-sm text-gray-400">Cliquez sur "Ouvrir dans un nouvel onglet" pour le visualiser</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ⭐ MODAL LETTRE DE MOTIVATION */}
      {showLMModal && lmUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <MailIcon className="w-6 h-6" />
                  Lettre de motivation
                </h2>
                <button
                  onClick={() => {
                    setShowLMModal(false)
                    setLmUrl(null)
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="flex justify-center gap-3 mb-4">
                <button
                  onClick={() => telechargerDocument(lmUrl, 'lettre_motivation')}
                  className="glass-button flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Ouvrir dans un nouvel onglet
                </button>
                <button
                  onClick={() => window.open(lmUrl, '_blank')}
                  className="glass-button flex items-center gap-2 bg-green-500/80 hover:bg-green-600/80"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
              </div>
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300">La lettre de motivation est disponible</p>
                  <p className="text-sm text-gray-400">Cliquez sur "Ouvrir dans un nouvel onglet" pour la visualiser</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL - Publier ou modifier une offre */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Plus className="w-6 h-6" />
                  {editingOffreId ? 'Modifier une offre' : 'Publier une offre'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Titre de l'offre *</label>
                  <input
                    type="text"
                    value={formData.titre}
                    onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Ex: Développeur Full Stack Senior"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="glass-input w-full min-h-[120px]"
                    placeholder="Décrivez le poste, les missions, les compétences requises..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Poste *</label>
                    <select
                      value={formData.poste_id}
                      onChange={(e) => setFormData({ ...formData, poste_id: Number(e.target.value) })}
                      className="glass-input w-full"
                      required
                    >
                      <option value={0}>Sélectionner</option>
                      {postes.map(p => (
                        <option key={p.id} value={p.id}>{p.titre}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Type de contrat *</label>
                    <select
                      value={formData.contrat_id}
                      onChange={(e) => setFormData({ ...formData, contrat_id: Number(e.target.value) })}
                      className="glass-input w-full"
                      required
                    >
                      <option value={0}>Sélectionner</option>
                      {contrats.map(c => (
                        <option key={c.id} value={c.id}>{c.type_contrat}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Localisation</label>
                    <input
                      type="text"
                      value={formData.localisation}
                      onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                      className="glass-input w-full"
                      placeholder="Paris, Lyon, Remote..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Date d'expiration</label>
                    <input
                      type="date"
                      value={formData.date_expiration}
                      onChange={(e) => setFormData({ ...formData, date_expiration: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Salaire min (€)</label>
                    <input
                      type="number"
                      value={formData.salaire_min}
                      onChange={(e) => setFormData({ ...formData, salaire_min: e.target.value })}
                      className="glass-input w-full"
                      placeholder="35000"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Salaire max (€)</label>
                    <input
                      type="number"
                      value={formData.salaire_max}
                      onChange={(e) => setFormData({ ...formData, salaire_max: e.target.value })}
                      className="glass-input w-full"
                      placeholder="45000"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Compétences requises</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    {competences.map(comp => (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => toggleCompetence(comp.id)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          formData.competence_ids.includes(comp.id)
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {comp.nom}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={modalLoading}
                    className="flex-1 glass-button flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {modalLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Publication...
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        Publier l'offre
                      </>
                    )}
                  </button>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ⭐ MODAL PROFIL COMPLET DU CANDIDAT */}
      {showCandidatModal && candidatDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <User className="w-6 h-6" />
                  Profil complet du candidat
                </h2>
                <button
                  onClick={() => {
                    setShowCandidatModal(false)
                    setCandidatDetail(null)
                    setSelectedCandidature(null)
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {loadingCandidat ? (
                <div className="text-center py-8">
                  <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
                  <p className="mt-2 text-gray-500">Chargement du profil...</p>
                </div>
              ) : (
                <>
                  {/* Photo et infos principales */}
                  <div className="flex flex-col md:flex-row items-center gap-6 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <img
                      src={getCandidatPhotoUrl(candidatDetail.id)}
                      alt={`${candidatDetail.prenom} ${candidatDetail.nom}`}
                      className="w-24 h-24 rounded-full object-cover border-4 border-primary-500/30 flex-shrink-0 bg-gray-100 dark:bg-gray-800"
                    />
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                        {candidatDetail.prenom} {candidatDetail.nom}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2">
                        <Mail className="w-4 h-4" />
                        {candidatDetail.email || 'Email non disponible'}
                      </p>
                      {candidatDetail.telephone && (
                        <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2">
                          <Phone className="w-4 h-4" />
                          {candidatDetail.telephone}
                        </p>
                      )}
                      {candidatDetail.adresse && (
                        <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2">
                          <MapPin className="w-4 h-4" />
                          {candidatDetail.adresse}
                        </p>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                        {candidatDetail.nombre_candidatures || 0}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Candidatures</p>
                    </div>
                  </div>

                  {/* Grille d'informations */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Niveau d'étude</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {candidatDetail.niveau_etude || 'Non spécifié'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Années d'expérience</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {candidatDetail.annees_experience || 0} ans
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Disponibilité</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                        {candidatDetail.disponibilite || 'Non spécifiée'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Statut</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        candidatDetail.actif !== false
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {candidatDetail.actif !== false ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>

                  {/* Compétences */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-500" />
                      Compétences ({candidatDetail.competences?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {candidatDetail.competences?.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune compétence</p>
                      ) : (
                        candidatDetail.competences?.map((comp: any) => (
                          <span key={comp.id} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {comp.nom}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Formations */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-green-500" />
                      Formations ({candidatDetail.formations?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {candidatDetail.formations?.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune formation</p>
                      ) : (
                        candidatDetail.formations?.map((formation: any) => (
                          <div key={formation.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-start gap-3">
                            <GraduationCap className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium text-gray-800 dark:text-gray-200">{formation.titre}</p>
                              {formation.etablissement && (
                                <p className="text-sm text-gray-600 dark:text-gray-300">{formation.etablissement}</p>
                              )}
                              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {formation.domaine && <span>Domaine: {formation.domaine}</span>}
                                {formation.niveau && <span>Niveau: {formation.niveau}</span>}
                                {formation.date_debut && formation.date_fin && (
                                  <span>
                                    {formation.date_debut} - {formation.date_fin}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* CV */}
                  {candidatDetail.a_cv && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary-500" />
                        CV
                      </h4>
                      <div className="flex gap-3">
                        <button
                          onClick={() => window.open(`/api/candidats/${candidatDetail.id}/cv?token=${encodeURIComponent(getToken() || '')}`, '_blank')}
                          className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Voir le CV
                        </button>
                        <button
                          onClick={() => window.open(`/api/candidats/${candidatDetail.id}/cv?token=${encodeURIComponent(getToken() || '')}`, '_blank')}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Lettre de motivation */}
                  {candidatDetail.a_lettre_motivation && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                        <MailIcon className="w-5 h-5 text-purple-500" />
                        Lettre de motivation
                      </h4>
                      <div className="flex gap-3">
                        <button
                          onClick={() => window.open(`/api/candidats/${candidatDetail.id}/lettre-motivation?token=${encodeURIComponent(getToken() || '')}`, '_blank')}
                          className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Voir la lettre
                        </button>
                        <button
                          onClick={() => window.open(`/api/candidats/${candidatDetail.id}/lettre-motivation?token=${encodeURIComponent(getToken() || '')}`, '_blank')}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Score de compatibilité */}
                  {candidatDetail.score_compatibilite !== undefined && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary-500" />
                        Score de compatibilité
                      </h4>
                      <div className={`p-3 rounded-lg ${getCompatibiliteColor(candidatDetail.score_compatibilite)}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold">{candidatDetail.score_compatibilite}%</span>
                          <span className="text-sm">
                            {candidatDetail.score_compatibilite >= 80 ? '🌟 Excellent' :
                             candidatDetail.score_compatibilite >= 60 ? '👍 Bon' :
                             candidatDetail.score_compatibilite >= 40 ? '📊 Moyen' : '📉 Faible'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ⭐ ACTIONS */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {candidatDetail.statut_candidature === 'ACCEPTEE' && (
                      <button
                        onClick={async () => {
                          const candidatureFake = {
                            id: candidatDetail.candidature_id || 1,
                            candidat_prenom: candidatDetail.prenom,
                            candidat_nom: candidatDetail.nom,
                            candidat_id: candidatDetail.id
                          }
                          await ouvrirModalEmbauche(candidatureFake)
                        }}
                        className="flex-1 glass-button flex items-center justify-center gap-2"
                      >
                        <UserPlus className="w-5 h-5" />
                        Embaucher ce candidat
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setShowCandidatModal(false)
                        setCandidatDetail(null)
                      }}
                      className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => {
                        afficherNotification('Fonctionnalité de messagerie à venir', 'info')
                      }}
                      className="px-4 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Contacter
                    </button>
                  </div>
                </>
              )}
            </GlassCard>
          </div>
        </div>
      )}

      {/* ⭐ MODAL EMBAUCHER */}
      {showConvertModal && selectedCandidature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <UserPlus className="w-6 h-6" />
                  Embaucher {selectedCandidature.candidat_prenom || ''} {selectedCandidature.candidat_nom || ''}
                </h2>
                <button
                  onClick={() => {
                    setShowConvertModal(false)
                    setSelectedCandidature(null)
                    setConvertData({
                      poste_id: 0,
                      departement_id: 0,
                      contrat_id: 0,
                      date_embauche: '',
                      titre_poste: ''
                    })
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Info candidat */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center gap-3">
                <img
                  src={getCandidatPhotoUrl(selectedCandidature.candidat_id)}
                  alt="Photo"
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary-500/30 flex-shrink-0"
                />
                <div>
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {selectedCandidature.candidat_prenom} {selectedCandidature.candidat_nom}
                  </p>
                  <p className="text-sm text-gray-500">ID: #{selectedCandidature.candidat_id}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Poste *</label>
                  <select
                    value={convertData.poste_id}
                    onChange={(e) => setConvertData({ ...convertData, poste_id: Number(e.target.value) })}
                    className="glass-input w-full"
                    required
                    disabled={loadingConversionData}
                  >
                    <option value={0}>
                      {loadingConversionData ? 'Chargement...' : 'Sélectionner un poste'}
                    </option>
                    {postes.map(p => (
                      <option key={p.id} value={p.id}>{p.titre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Département</label>
                  <select
                    value={convertData.departement_id}
                    onChange={(e) => setConvertData({ ...convertData, departement_id: Number(e.target.value) })}
                    className="glass-input w-full"
                    disabled={loadingConversionData}
                  >
                    <option value={0}>
                      {loadingConversionData ? 'Chargement...' : 'Sélectionner un département'}
                    </option>
                    {departements.map(d => (
                      <option key={d.id} value={d.id}>{d.nom}</option>
                    ))}
                  </select>
                  {!loadingConversionData && departements.length === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Aucun département disponible (champ optionnel)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Contrat</label>
                  <select
                    value={convertData.contrat_id}
                    onChange={(e) => setConvertData({ ...convertData, contrat_id: Number(e.target.value) })}
                    className="glass-input w-full"
                    disabled={loadingConversionData}
                  >
                    <option value={0}>
                      {loadingConversionData ? 'Chargement...' : 'Sélectionner un contrat'}
                    </option>
                    {contrats.map(c => (
                      <option key={c.id} value={c.id}>{c.type_contrat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Date d'embauche *</label>
                  <input
                    type="date"
                    value={convertData.date_embauche}
                    onChange={(e) => setConvertData({ ...convertData, date_embauche: e.target.value })}
                    className="glass-input w-full"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Titre du poste *</label>
                  <input
                    type="text"
                    value={convertData.titre_poste}
                    onChange={(e) => setConvertData({ ...convertData, titre_poste: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Ex: Lead Developer"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConvertModal(false)
                      setSelectedCandidature(null)
                    }}
                    className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={() => handleConvertir(selectedCandidature.id)}
                    disabled={conversionLoading || loadingConversionData}
                    className="flex-1 glass-button flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {conversionLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        Embaucher
                      </>
                    )}
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* En-tête avec Logo Entreprise */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              {/* ⭐ BALISE IMG SIMPLE AVEC URL CENTRALISÉE */}
              <img
                key={`logo-${entreprise?.id || 0}-${imageVersion}`}
                src={getEntrepriseLogoUrl(entreprise?.id || 0)}
                alt={entreprise?.nom || 'Logo'}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-primary-500/30 flex-shrink-0 bg-gray-100 dark:bg-gray-800"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="absolute bottom-0 right-0 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-md transition-transform transform hover:scale-110 disabled:opacity-50"
                title="Changer le logo"
              >
                {uploadingLogo ? <Upload className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </div>

            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                {entreprise?.nom || 'Mon entreprise'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 font-medium">
                {entreprise?.secteur_activite || "Secteur d'activité non renseigné"} • {entreprise?.adresse || "Adresse non renseignée"}
              </p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-medium">
                  {entreprise?.taille_entreprise || "Taille non définie"}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-medium">
                  {statistiques.offres_publiees} offres publiées
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-full text-xs font-medium">
                  {statistiques.nombre_candidatures} candidatures reçues
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 font-semibold rounded-xl border border-primary-500/20 flex items-center gap-2 transition-all"
            >
              <Camera className="w-4 h-4" />
              Modifier Logo
            </button>
            <button
              onClick={openModal}
              className="glass-button flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Publier une offre
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Statistiques avancées */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 'stat-1', icone: <Briefcase className="w-6 h-6" />, label: "Offres publiées", valeur: statistiques.offres_publiees, couleur: "from-blue-500 to-cyan-500" },
          { id: 'stat-2', icone: <TrendingUp className="w-6 h-6" />, label: "Offres actives", valeur: statistiques.offres_actives, couleur: "from-green-500 to-emerald-500" },
          { id: 'stat-3', icone: <Users className="w-6 h-6" />, label: "Candidatures reçues", valeur: statistiques.nombre_candidatures, couleur: "from-purple-500 to-pink-500" },
          { id: 'stat-4', icone: <BarChart className="w-6 h-6" />, label: "Taux de succès", valeur: `${statistiques.taux_succes}%`, couleur: "from-orange-500 to-red-500" }
        ].map((stat) => (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GlassCard className="p-4 hover:scale-105 transition-transform cursor-pointer">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.couleur} flex items-center justify-center text-white mb-3`}>
                {stat.icone}
              </div>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{stat.valeur}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Graphique d'activité */}
      <div className="grid md:grid-cols-3 gap-4">
        <GlassCard className="p-6 md:col-span-2">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-500" />
            Activité des candidatures
          </h3>
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setStatsPeriode('semaine')}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  statsPeriode === 'semaine'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Semaine
              </button>
              <button
                onClick={() => setStatsPeriode('mois')}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  statsPeriode === 'mois'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Mois
              </button>
              <button
                onClick={() => setStatsPeriode('annee')}
                className={`px-3 py-1 rounded-lg text-sm transition-all ${
                  statsPeriode === 'annee'
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Année
              </button>
            </div>
            <span className="text-sm text-gray-500">
              Total: {statsData.totalCandidatures} candidatures
            </span>
          </div>
          <div className="flex gap-4">
            <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm text-gray-500">Acceptées</p>
              <p className="text-2xl font-bold text-green-600">{statsData.tauxAcceptation}%</p>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                <div className="h-full bg-green-500 rounded-full" style={{ width: `${statsData.tauxAcceptation}%` }} />
              </div>
            </div>
            <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm text-gray-500">Refusées</p>
              <p className="text-2xl font-bold text-red-600">{statsData.tauxRefus}%</p>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-2">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${statsData.tauxRefus}%` }} />
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-500" />
            Répartition des candidatures
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(statsData.candidaturesParOffre).length > 0 ? (
              Object.entries(statsData.candidaturesParOffre).map(([titre, count]) => (
                <div key={titre} className="flex items-center justify-between">
                  <span className="text-sm truncate">{titre}</span>
                  <span className="text-sm font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-400 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Aucune candidature reçue</p>
            )}
          </div>
        </GlassCard>
      </div>

      {/* ⭐ CANDIDATS RECOMMANDÉS AVEC PHOTOS */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-500" />
            Meilleurs candidats recommandés
            {candidatsRecommandes.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({candidatsRecommandes.length})
              </span>
            )}
          </h2>
          <Link to="/candidatures" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            Voir toutes les candidatures
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        {loadingRecommandations ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto" />
            <p className="mt-2 text-gray-500">Recherche des meilleurs candidats...</p>
          </div>
        ) : candidatsRecommandes.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucun candidat recommandé pour le moment
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Publiez des offres pour recevoir des recommandations de candidats
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {candidatsRecommandes.map((candidat, index) => {
              const score = candidat.score_compatibilite || 0
              const hasCV = candidat.a_cv || false
              const hasLM = candidat.a_lettre_motivation || false
              
              return (
                <motion.div
                  key={`candidat-reco-${candidat.id || index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                >
                  <GlassCard className="p-4 hover:shadow-lg transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={getCandidatPhotoUrl(candidat.id)}
                          alt="Photo"
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary-500/30 flex-shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">
                            {candidat.prenom} {candidat.nom}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {candidat.email}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {candidat.offre_titre || 'Offre'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {hasCV && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full flex items-center gap-0.5">
                                <FileText className="w-3 h-3" />
                                CV
                              </span>
                            )}
                            {hasLM && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full flex items-center gap-0.5">
                                <MailIcon className="w-3 h-3" />
                                LM
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${getCompatibiliteColor(score)}`}>
                          {score}% match
                        </div>
                        {hasCV && (
                          <button
                            onClick={() => voirCV(candidat.id)}
                            className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Voir le CV"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {hasLM && (
                          <button
                            onClick={() => voirLettreMotivation(candidat.id)}
                            className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Voir la lettre de motivation"
                          >
                            <MailIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => voirCandidatComplet(candidat.id)}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Voir le profil complet"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })}
          </div>
        )}
      </motion.div>

      {/* ⭐ Candidatures récentes avec CV, lettre et photos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            Dernières candidatures
          </h2>
          <Link to="/candidatures" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
            Voir toutes <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="space-y-3">
          {candidaturesRecentes.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucune candidature récente
              </p>
            </GlassCard>
          ) : (
            candidaturesRecentes.map((candidature) => {
              const statutInfo = getStatutLabel(candidature.statut)
              const score = candidature.score_compatibilite || 0
              const hasCV = candidature.a_cv || false
              const hasLM = candidature.a_lettre_motivation || false
              
              return (
                <motion.div
                  key={`candidature-${candidature.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <GlassCard className="p-4 hover:shadow-lg transition-all cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={getCandidatPhotoUrl(candidature.candidat_id)}
                          alt="Photo"
                          className="w-10 h-10 rounded-full object-cover border-2 border-primary-500/30 flex-shrink-0"
                        />
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">
                            {candidature.candidat_prenom} {candidature.candidat_nom}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {candidature.offre_titre}
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {hasCV && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full flex items-center gap-0.5">
                                <FileText className="w-3 h-3" />
                                CV
                              </span>
                            )}
                            {hasLM && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full flex items-center gap-0.5">
                                <MailIcon className="w-3 h-3" />
                                LM
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {score > 0 && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompatibiliteColor(score)}`}>
                            {score}% match
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statutInfo.couleur}`}>
                          {statutInfo.label}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(candidature.date_candidature).toLocaleDateString('fr-FR')}
                        </span>
                        {hasCV && (
                          <button
                            onClick={() => voirCV(candidature.candidat_id)}
                            className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Voir le CV"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {hasLM && (
                          <button
                            onClick={() => voirLettreMotivation(candidature.candidat_id)}
                            className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Voir la lettre de motivation"
                          >
                            <MailIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedCandidature(candidature)
                            voirCandidatComplet(candidature.candidat_id)
                          }}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Voir le profil complet"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })
          )}
        </div>
      </motion.div>

      {/* ⭐ Mes offres avec suppression */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-500" />
            Mes offres
            {offres.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({offres.length})
              </span>
            )}
          </h2>
          <button
            onClick={openModal}
            className="glass-button text-sm flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvelle offre
          </button>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {offres.length === 0 ? (
            <GlassCard className="p-8 text-center col-span-2">
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucune offre publiée
              </p>
              <button
                onClick={openModal}
                className="mt-4 glass-button text-sm"
              >
                Publier une offre
              </button>
            </GlassCard>
          ) : (
            offres.map((offre) => {
              const statut = getStatutLabel(offre.statut)
              return (
                <motion.div
                  key={`offre-${offre.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <GlassCard className="p-4 hover:shadow-lg transition-all">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">
                          {offre.titre}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {offre.localisation || 'Localisation non spécifiée'}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statut.couleur}`}>
                            {statut.label}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300">
                            {offre.nombre_candidatures || 0} candidatures
                          </span>
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 rounded-full text-xs text-blue-600 dark:text-blue-400">
                            {new Date(offre.date_publication).toLocaleDateString('fr-FR')}
                          </span>
                          {offre.salaire_min && offre.salaire_max && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 rounded-full text-xs text-green-600 dark:text-green-400">
                              {offre.salaire_min} - {offre.salaire_max}€
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleVoirCandidatures(offre.id)}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Voir les candidatures"
                        >
                          <Users className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOffre(offre)
                            setShowOffreDetails(true)
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Détails"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(offre)}
                          className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                          title="Modifier l'offre"
                        >
                          <Edit className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ show: true, offreId: offre.id })}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Supprimer l'offre"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              )
            })
          )}
        </div>
      </motion.div>

      {/* MODAL Détails Offre */}
      {showOffreDetails && selectedOffre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Détails de l'offre
                </h2>
                <button
                  onClick={() => {
                    setShowOffreDetails(false)
                    setSelectedOffre(null)
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{selectedOffre.titre}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{selectedOffre.localisation || 'Localisation non spécifiée'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Statut</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatutLabel(selectedOffre.statut).couleur}`}>
                      {getStatutLabel(selectedOffre.statut).label}
                    </span>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Candidatures</p>
                    <p className="font-semibold">{selectedOffre.nombre_candidatures || 0}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date de publication</p>
                    <p className="font-semibold">{new Date(selectedOffre.date_publication).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Salaire</p>
                    <p className="font-semibold">
                      {selectedOffre.salaire_min && selectedOffre.salaire_max 
                        ? `${selectedOffre.salaire_min} - ${selectedOffre.salaire_max}€` 
                        : 'Non spécifié'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Description</p>
                  <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                    {selectedOffre.description || 'Aucune description'}
                  </p>
                </div>

                {selectedOffre.competences && selectedOffre.competences.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Compétences requises</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {selectedOffre.competences.map((comp: any) => (
                        <span key={comp.id} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm">
                          {comp.nom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowOffreDetails(false)
                      handleVoirCandidatures(selectedOffre.id)
                    }}
                    className="flex-1 glass-button flex items-center justify-center gap-2"
                  >
                    <Users className="w-5 h-5" />
                    Voir les candidatures
                  </button>
                  <button
                    onClick={() => {
                      setShowOffreDetails(false)
                      setSelectedOffre(null)
                    }}
                    className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* MODAL Candidatures par offre */}
      {showCandidaturesOffre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Candidatures reçues
                </h2>
                <button
                  onClick={() => {
                    setShowCandidaturesOffre(false)
                    setCandidaturesOffre([])
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                {candidaturesOffre.length === 0 ? (
                  <p className="text-center text-gray-500">Aucune candidature pour cette offre</p>
                ) : (
                  candidaturesOffre.map((candidature) => {
                    const statutInfo = getStatutLabel(candidature.statut)
                    const score = candidature.score_compatibilite || 0
                    const hasCV = candidature.a_cv || false
                    const hasLM = candidature.a_lettre_motivation || false
                    
                    return (
                      <motion.div
                        key={`cand-offre-${candidature.id}`}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <GlassCard className="p-4 hover:shadow-lg transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img
                                src={getCandidatPhotoUrl(candidature.candidat_id)}
                                alt="Photo"
                                className="w-10 h-10 rounded-full object-cover border-2 border-primary-500/30 flex-shrink-0"
                              />
                              <div>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                  {candidature.candidat_prenom} {candidature.candidat_nom}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(candidature.date_candidature).toLocaleDateString('fr-FR')}
                                </p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {hasCV && (
                                    <span className="text-xs px-1.5 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full flex items-center gap-0.5">
                                      <FileText className="w-3 h-3" />
                                      CV
                                    </span>
                                  )}
                                  {hasLM && (
                                    <span className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full flex items-center gap-0.5">
                                      <MailIcon className="w-3 h-3" />
                                      LM
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {score > 0 && (
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompatibiliteColor(score)}`}>
                                  {score}% match
                                </span>
                              )}
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${statutInfo.couleur}`}>
                                {statutInfo.label}
                              </span>
                              {hasCV && (
                                <button
                                  onClick={() => voirCV(candidature.candidat_id)}
                                  className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                                  title="Voir le CV"
                                >
                                  <FileText className="w-4 h-4" />
                                </button>
                              )}
                              {hasLM && (
                                <button
                                  onClick={() => voirLettreMotivation(candidature.candidat_id)}
                                  className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                                  title="Voir la lettre de motivation"
                                >
                                  <MailIcon className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedCandidature(candidature)
                                  setShowCandidaturesOffre(false)
                                  voirCandidatComplet(candidature.candidat_id)
                                }}
                                className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                title="Voir le profil complet"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    )
                  })
                )}
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardEntreprise
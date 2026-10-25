// pages/Candidatures.tsx
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import Skeleton from '@/components/Skeleton'
import { 
  Users, UserCheck, UserX, Calendar, Clock, Eye, 
  CheckCircle, XCircle, AlertCircle, FileText, 
  Briefcase, Building2, ChevronDown, ChevronUp,
  UserPlus, ExternalLink, Filter, Search, RefreshCw,
  Check, X, MessageCircle, Award, GraduationCap,
  Mail, Phone, MapPin, User, Star, Heart, Download,
  Printer, Share2, BookOpen, Target, Zap, TrendingUp,
  Loader2, File, Send, Upload, AlertTriangle,
  File as FileIcon, Mail as MailIcon, User as UserIcon,
  ChevronRight
} from 'lucide-react'
import { useNotificationStore } from '@/store/useStore'
import { useAuthStore } from '@/store/useStore'
import { candidatureService, Candidature, CandidatureUpdate } from '@/services/candidatureService'
import { employeService } from '@/services/employeService'
import { offreService } from '@/services/offreService'
import { candidatService } from '@/services/candidatService'
import { departementService } from '@/services/departementService'
// ⭐ API_ORIGIN sert pour les URLs absolues (CV/LM/profil/photo)
import { getToken, API_ORIGIN } from '@/services/api'
import { Link, useNavigate } from 'react-router-dom'

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

// ⭐ COMPOSANT PHOTO AVEC FALLBACK - CORRIGÉ AVEC API_ORIGIN
const CandidatPhoto = ({ 
  candidatId, 
  prenom, 
  nom, 
  size = 'w-10 h-10',
  className = ''
}: { 
  candidatId: number
  prenom: string
  nom: string
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
        // ⭐ URL ABSOLUE via API_ORIGIN — fonctionne en prod Render
        const response = await fetch(`${API_ORIGIN}/api/candidats/${candidatId}/photo?t=${Date.now()}`, {
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
  }, [candidatId])
  
  if (loading) {
    return (
      <div className={`${size} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 ${className}`}>
        <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
      </div>
    )
  }
  
  if (photoError || !photoUrl) {
    return (
      <div className={`${size} rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${className}`}>
        {prenom?.charAt(0)?.toUpperCase() || ''}{nom?.charAt(0)?.toUpperCase() || ''}
      </div>
    )
  }
  
  return (
    <img
      src={photoUrl}
      alt={`${prenom} ${nom}`}
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

// ⭐ COMPOSANT POUR AFFICHER LE DOCUMENT (CV ou LM) — CORRIGÉ AVEC API_ORIGIN
const DocumentViewer = ({ 
  url, 
  title, 
  onClose 
}: { 
  url: string
  title: string
  onClose: () => void
}) => {
  const downloadDocument = async () => {
    try {
      const response = await fetch(url, {
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : undefined,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      const disposition = response.headers.get('content-disposition') || ''
      const serverName = disposition.match(/filename="?([^";]+)"?/i)?.[1]
      const extension = serverName?.split('.').pop() || (blob.type.includes('pdf')
        ? 'pdf'
        : blob.type.includes('wordprocessingml')
          ? 'docx'
          : blob.type.includes('msword')
            ? 'doc'
        : 'bin')
      anchor.download = `${title.toLowerCase().includes('lettre') ? 'lettre_motivation' : 'cv'}.${extension}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (error) {
      console.error('Erreur téléchargement document:', error)
      window.open(url, '_blank')
    }
  }

  return (
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
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex justify-center gap-3 mb-4">
            <button
              onClick={() => window.open(url, '_blank')}
              className="glass-button flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Ouvrir dans un nouvel onglet
            </button>
            <button
              onClick={downloadDocument}
              className="glass-button flex items-center gap-2 bg-green-500/80 hover:bg-green-600/80"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </button>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Le document est disponible</p>
              <p className="text-sm text-gray-400">Cliquez sur "Ouvrir dans un nouvel onglet" pour le visualiser</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

const Candidatures = () => {
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

  const [candidatures, setCandidatures] = useState<Candidature[]>([])
  const [filteredCandidatures, setFilteredCandidatures] = useState<Candidature[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('TOUS')
  const [selectedCandidature, setSelectedCandidature] = useState<Candidature | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [showCandidatModal, setShowCandidatModal] = useState(false)
  const [candidatComplet, setCandidatComplet] = useState<any>(null)
  const [loadingCandidat, setLoadingCandidat] = useState(false)
  const [postes, setPostes] = useState<{ id: number; titre: string }[]>([])
  const [departements, setDepartements] = useState<{ id: number; nom: string }[]>([])
  const [contrats, setContrats] = useState<{ id: number; type_contrat: string }[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'score' | 'statut'>('date')
  const [showCVModal, setShowCVModal] = useState(false)
  const [cvUrl, setCvUrl] = useState<string | null>(null)
  const [showLMModal, setShowLMModal] = useState(false)
  const [lmUrl, setLmUrl] = useState<string | null>(null)
  
  // ⭐ ÉTAT POUR LA CONVERSION
  const [conversionLoading, setConversionLoading] = useState(false)
  // ⭐ État de chargement des listes du modal d'embauche
  const [loadingConversionData, setLoadingConversionData] = useState(false)
  const [convertData, setConvertData] = useState({
    poste_id: 0,
    departement_id: 0,
    contrat_id: 0,
    date_embauche: '',
    titre_poste: ''
  })

  const statutLabels: Record<string, { label: string; couleur: string; icone: any }> = {
    EN_ATTENTE: { 
      label: 'En attente', 
      couleur: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      icone: Clock
    },
    EN_COURS: { 
      label: 'En cours', 
      couleur: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      icone: AlertCircle
    },
    ENTRETIEN: { 
      label: 'Entretien', 
      couleur: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      icone: Calendar
    },
    ACCEPTEE: { 
      label: 'Acceptée', 
      couleur: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      icone: CheckCircle
    },
    REFUSEE: { 
      label: 'Refusée', 
      couleur: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      icone: XCircle
    }
  }

  // ⭐ FONCTION POUR VÉRIFIER LE TOKEN AVEC getToken()
  const verifyToken = (): boolean => {
    const token = getToken()
    if (!token) {
      afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
      navigate('/connexion')
      return false
    }
    return true
  }

  // ⭐ CORRECTION MAJEURE : utiliser departementService (axios) au lieu de fetch('/api/...')
  // Ceci bénéficie du baseURL configuré dans api.ts → fonctionne en prod Render
  const fetchDepartements = async (): Promise<{ id: number; nom: string }[]> => {
    try {
      console.log('🟡 [fetchDepartements] appel via departementService.getDepartements()')
      const data = await departementService.getDepartements()
      console.log(`✅ [fetchDepartements] ${data.length} départements reçus`, data)
      return normaliserListe(data).map((d: any) => ({ id: d.id, nom: d.nom }))
    } catch (e: any) {
      console.error('🔴 [fetchDepartements] erreur:', e?.response?.status, e?.message)
      return []
    }
  }

  // ⭐ Charger les listes du modal d'embauche
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

  // ⭐ FETCH DATA - CORRIGÉ AVEC API_ORIGIN
  const fetchData = async () => {
    // ⭐ Vérifier le token AVANT de faire la requête
    if (!verifyToken()) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      console.log('🔑 Token trouvé, chargement des candidatures...')
      
      // Récupérer les données principales
      const [candidaturesData, postesData, contratsData] = await Promise.all([
        candidatureService.getMesCandidatures(),
        offreService.getPostes(),
        offreService.getContrats()
      ])
      
      // ⭐ Ajouter les scores et infos supplémentaires — URLs absolues via API_ORIGIN
      const candidaturesAvecScores = await Promise.all(
        candidaturesData.map(async (candidature) => {
          try {
            const token = getToken()
            if (!token) return candidature
            
            // Récupérer le score
            let scoreData = null
            let aLettreMotivation = false
            
            try {
              const scoreResponse = await fetch(
                `${API_ORIGIN}/api/candidats/${candidature.candidat_id}/score/${candidature.offre_id}`,
                {
                  headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              )
              
              if (scoreResponse.ok) {
                scoreData = await scoreResponse.json()
              }
            } catch (e) {
              // Ignorer l'erreur, on continue
            }
            
            // Vérifier si le candidat a une lettre de motivation
            try {
              const lmResponse = await fetch(
                `${API_ORIGIN}/api/candidats/${candidature.candidat_id}/lettre-motivation`,
                {
                  headers: { 'Authorization': `Bearer ${token}` }
                }
              )
              if (lmResponse.ok) {
                aLettreMotivation = true
              }
            } catch (e) {
              // Ignorer l'erreur
            }
            
            return { 
              ...candidature, 
              score_compatibilite: scoreData?.score || 0,
              a_lettre_motivation: aLettreMotivation
            }
          } catch (error) {
            console.error(`Erreur traitement candidature ${candidature.id}:`, error)
            return candidature
          }
        })
      )
      
      setCandidatures(candidaturesAvecScores)
      setFilteredCandidatures(candidaturesAvecScores)
      setPostes(postesData)
      setContrats(contratsData)
      
      // ⭐ Récupérer les départements - via departementService
      const departementsData = await fetchDepartements()
      setDepartements(departementsData)
    } catch (error: any) {
      console.error('Erreur chargement candidatures:', error)
      
      // ⭐ Gérer les erreurs 401
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      afficherNotification('Erreur lors du chargement des candidatures', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // ⭐ Ne charger les données que si l'utilisateur est connecté
    if (estConnecte && utilisateur && (utilisateur.role === 'entreprise' || utilisateur.role === 'admin')) {
      fetchData()
    }
  }, [estConnecte, utilisateur])

  // ⭐ FILTRES ET TRI
  useEffect(() => {
    let filtered = [...candidatures]
    
    if (search) {
      filtered = filtered.filter(c => 
        c.candidat_nom?.toLowerCase().includes(search.toLowerCase()) ||
        c.candidat_prenom?.toLowerCase().includes(search.toLowerCase()) ||
        c.offre_titre?.toLowerCase().includes(search.toLowerCase())
      )
    }
    
    if (filterStatut !== 'TOUS') {
      filtered = filtered.filter(c => c.statut === filterStatut)
    }
    
    switch (sortBy) {
      case 'date':
        filtered.sort((a, b) => new Date(b.date_candidature).getTime() - new Date(a.date_candidature).getTime())
        break
      case 'score':
        filtered.sort((a, b) => (b.score_compatibilite || 0) - (a.score_compatibilite || 0))
        break
      case 'statut':
        const statutOrder = { ACCEPTEE: 0, ENTRETIEN: 1, EN_COURS: 2, EN_ATTENTE: 3, REFUSEE: 4 }
        filtered.sort((a, b) => (statutOrder[a.statut as keyof typeof statutOrder] || 5) - (statutOrder[b.statut as keyof typeof statutOrder] || 5))
        break
    }
    
    setFilteredCandidatures(filtered)
  }, [search, filterStatut, candidatures, sortBy])

  // ⭐ ACTIONS SUR LES CANDIDATURES - CORRIGÉES
  const handleUpdateStatut = async (candidatureId: number, statut: string) => {
    if (!verifyToken()) return
    
    try {
      await candidatureService.updateCandidature(candidatureId, { statut: statut as any })
      const statutLabel = statutLabels[statut]?.label || statut
      afficherNotification(`Candidature ${statutLabel} avec succès`, 'success')
      await fetchData()
    } catch (error: any) {
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      afficherNotification(error.response?.data?.detail || 'Erreur lors de la mise à jour', 'error')
    }
  }

  const handleBulkAction = async (statut: string) => {
    if (!verifyToken()) return
    
    if (selectedIds.length === 0) {
      afficherNotification('Veuillez sélectionner des candidatures', 'error')
      return
    }
    try {
      for (const id of selectedIds) {
        await candidatureService.updateCandidature(id, { statut: statut as any })
      }
      const statutLabel = statutLabels[statut]?.label || statut
      afficherNotification(`${selectedIds.length} candidatures ${statutLabel} avec succès`, 'success')
      setSelectedIds([])
      setShowBulkActions(false)
      await fetchData()
    } catch (error: any) {
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      afficherNotification('Erreur lors de la mise à jour en masse', 'error')
    }
  }

  // ⭐ VOIR LE PROFIL COMPLET DU CANDIDAT - URL ABSOLUE via API_ORIGIN
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
      
      const response = await fetch(`${API_ORIGIN}/api/candidats/${candidatId}/complet`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setCandidatComplet(data)
      } else if (response.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
      } else {
        afficherNotification('Erreur lors du chargement du profil', 'error')
      }
    } catch (error) {
      console.error('Erreur chargement profil:', error)
      afficherNotification('Erreur lors du chargement du profil', 'error')
    } finally {
      setLoadingCandidat(false)
    }
  }

  // ⭐ VOIR LE CV - URL ABSOLUE via API_ORIGIN
  const voirCV = (candidatId: number) => {
    if (!verifyToken()) return
    
    const token = getToken()
    if (!token) {
      afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
      navigate('/connexion')
      return
    }
    const url = `${API_ORIGIN}/api/candidats/${candidatId}/cv?token=${encodeURIComponent(token)}&t=${Date.now()}`
    setCvUrl(url)
    setShowCVModal(true)
  }

  // ⭐ VOIR LA LETTRE DE MOTIVATION - URL ABSOLUE via API_ORIGIN
  const voirLettreMotivation = (candidatId: number) => {
    if (!verifyToken()) return
    
    const token = getToken()
    if (!token) {
      afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
      navigate('/connexion')
      return
    }
    const url = `${API_ORIGIN}/api/candidats/${candidatId}/lettre-motivation?token=${encodeURIComponent(token)}&t=${Date.now()}`
    setLmUrl(url)
    setShowLMModal(true)
  }

  // ⭐ CONVERTIR EN EMPLOYÉ - envoie null au lieu de 0 pour les FK optionnelles
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
      const token = getToken()
      if (!token) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      
      // ⭐ Envoyer null au lieu de 0 pour les FK optionnelles
      const payload = {
        poste_id: convertData.poste_id,
        departement_id: convertData.departement_id > 0 ? convertData.departement_id : null,
        contrat_id: convertData.contrat_id > 0 ? convertData.contrat_id : null,
        date_embauche: convertData.date_embauche,
        titre_poste: convertData.titre_poste,
      }
      
      await candidatureService.convertirEnEmploye(candidatureId, payload as any)
      afficherNotification('✅ Candidat converti en employé avec succès !', 'success')
      
      setShowConvertModal(false)
      setShowCandidatModal(false)
      setSelectedCandidature(null)
      setCandidatComplet(null)
      setConvertData({
        poste_id: 0,
        departement_id: 0,
        contrat_id: 0,
        date_embauche: '',
        titre_poste: ''
      })
      await fetchData()
    } catch (error: any) {
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
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

  const getStatutInfo = (statut: string) => {
    return statutLabels[statut] || statutLabels.EN_ATTENTE
  }

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const getCompatibiliteColor = (score: number) => {
    if (score >= 80) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
    if (score >= 60) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
    if (score >= 40) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  }

  const statutsDisponibles = ['TOUS', 'EN_ATTENTE', 'EN_COURS', 'ENTRETIEN', 'ACCEPTEE', 'REFUSEE']

  // ⭐ SI L'UTILISATEUR N'EST PAS CONNECTÉ
  if (!estConnecte) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-12 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Accès restreint
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Veuillez vous connecter pour accéder à cette page.
          </p>
          <Link to="/connexion" className="glass-button">
            Se connecter
          </Link>
        </GlassCard>
      </div>
    )
  }

  // ⭐ SI L'UTILISATEUR N'EST PAS ENTREPRISE
  if (utilisateur && utilisateur.role !== 'entreprise' && utilisateur.role !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-12 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Accès réservé aux entreprises
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Cette page est réservée aux entreprises et aux administrateurs.
          </p>
          <Link to="/dashboard/candidat" className="glass-button">
            Retour au dashboard
          </Link>
        </GlassCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonLoader className="h-12 w-64" />
        <SkeletonLoader className="h-20" />
        {[...Array(3)].map((_, i) => (
          <SkeletonLoader key={`skeleton-${i}`} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ⭐ MODAL CV */}
      {showCVModal && cvUrl && (
        <DocumentViewer 
          url={cvUrl}
          title="CV du candidat"
          onClose={() => {
            setShowCVModal(false)
            setCvUrl(null)
          }}
        />
      )}

      {/* ⭐ MODAL LETTRE DE MOTIVATION */}
      {showLMModal && lmUrl && (
        <DocumentViewer 
          url={lmUrl}
          title="Lettre de motivation"
          onClose={() => {
            setShowLMModal(false)
            setLmUrl(null)
          }}
        />
      )}

      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Users className="w-8 h-8 text-primary-500" />
            Gestion des candidatures
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gérez les candidatures reçues sur vos offres
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (estConnecte && utilisateur && (utilisateur.role === 'entreprise' || utilisateur.role === 'admin')) {
                fetchData()
              }
            }}
            className="glass-button text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </button>
        </div>
      </motion.div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total', valeur: candidatures.length, couleur: 'from-blue-500 to-cyan-500', icone: Users },
          { label: 'En attente', valeur: candidatures.filter(c => c.statut === 'EN_ATTENTE').length, couleur: 'from-yellow-500 to-orange-500', icone: Clock },
          { label: 'Entretien', valeur: candidatures.filter(c => c.statut === 'ENTRETIEN').length, couleur: 'from-purple-500 to-pink-500', icone: Calendar },
          { label: 'Acceptées', valeur: candidatures.filter(c => c.statut === 'ACCEPTEE').length, couleur: 'from-green-500 to-emerald-500', icone: CheckCircle },
          { label: 'Refusées', valeur: candidatures.filter(c => c.statut === 'REFUSEE').length, couleur: 'from-red-500 to-pink-500', icone: XCircle }
        ].map((stat, index) => (
          <motion.div
            key={`stat-${index}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <GlassCard className="p-4 text-center">
              <stat.icone className="w-5 h-5 mx-auto mb-1 text-gray-600 dark:text-gray-400" />
              <p className={`text-2xl font-bold bg-gradient-to-r ${stat.couleur} bg-clip-text text-transparent`}>
                {stat.valeur}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Filtres et recherche */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par candidat ou offre..."
                className="glass-input w-full pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="glass-input px-3 py-2 text-sm min-w-[120px]"
              >
                <option value="date">Trier par date</option>
                <option value="score">Trier par score</option>
                <option value="statut">Trier par statut</option>
              </select>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {statutsDisponibles.map((statut) => {
                  const info = statut === 'TOUS' 
                    ? { label: 'Tous', couleur: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' }
                    : getStatutInfo(statut)
                  return (
                    <button
                      key={`statut-btn-${statut}`}
                      onClick={() => setFilterStatut(statut)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                        filterStatut === statut
                          ? 'bg-primary-500 text-white'
                          : info.couleur
                      }`}
                    >
                      {info.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Actions en masse */}
      {selectedIds.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard className="p-4 flex items-center justify-between flex-wrap gap-3">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {selectedIds.length} candidature{selectedIds.length > 1 ? 's' : ''} sélectionnée{selectedIds.length > 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleBulkAction('ACCEPTEE')}
                className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                <Check className="w-3 h-3" />
                Accepter toutes
              </button>
              <button
                onClick={() => handleBulkAction('ENTRETIEN')}
                className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                <Calendar className="w-3 h-3" />
                Entretien
              </button>
              <button
                onClick={() => handleBulkAction('REFUSEE')}
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Refuser toutes
              </button>
              <button
                onClick={() => {
                  setSelectedIds([])
                  setShowBulkActions(false)
                }}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-xs transition-colors"
              >
                Annuler
              </button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Liste des candidatures */}
      <div className="space-y-4">
        {filteredCandidatures.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Aucune candidature trouvée
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              Les candidatures apparaîtront ici lorsque des candidats postuleront à vos offres
            </p>
          </GlassCard>
        ) : (
          filteredCandidatures.map((candidature, index) => {
            const statutInfo = getStatutInfo(candidature.statut)
            const StatutIcon = statutInfo.icone
            const isSelected = selectedIds.includes(candidature.id)
            const score = candidature.score_compatibilite || 0
            const hasLM = candidature.a_lettre_motivation || false

            return (
              <motion.div
                key={`candidature-${candidature.id}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className={`p-4 transition-all ${isSelected ? 'border-2 border-primary-500' : ''}`}>
                  <div className="flex flex-col gap-4">
                    {/* Ligne principale */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(candidature.id)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500 flex-shrink-0"
                        />
                        
                        {/* ⭐ PHOTO DU CANDIDAT */}
                        <CandidatPhoto 
                          candidatId={candidature.candidat_id}
                          prenom={candidature.candidat_prenom || ''}
                          nom={candidature.candidat_nom || ''}
                          size="w-10 h-10"
                        />
                        
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {candidature.candidat_prenom} {candidature.candidat_nom}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 truncate">
                            <Briefcase className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{candidature.offre_titre || 'Offre'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${statutInfo.couleur}`}>
                          <StatutIcon className="w-3.5 h-3.5" />
                          {statutInfo.label}
                        </span>
                        
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(candidature.date_candidature).toLocaleDateString('fr-FR')}
                        </span>

                        {score > 0 && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCompatibiliteColor(score)}`}>
                            {score}% match
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* ⭐ BOUTON VOIR CV */}
                        {candidature.a_cv && (
                          <button
                            onClick={() => voirCV(candidature.candidat_id)}
                            className="p-2 text-primary-500 hover:text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                            title="Voir le CV"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                        )}

                        {/* ⭐ BOUTON VOIR LETTRE DE MOTIVATION */}
                        {hasLM && (
                          <button
                            onClick={() => voirLettreMotivation(candidature.candidat_id)}
                            className="p-2 text-purple-500 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Voir la lettre de motivation"
                          >
                            <MailIcon className="w-5 h-5" />
                          </button>
                        )}

                        {/* ⭐ BOUTON VOIR PROFIL COMPLET */}
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

                        {/* ⭐ ACTIONS STATUT */}
                        {candidature.statut === 'EN_ATTENTE' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatut(candidature.id, 'ACCEPTEE')}
                              className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-sm flex items-center gap-1 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                              Accepter
                            </button>
                            <button
                              onClick={() => handleUpdateStatut(candidature.id, 'ENTRETIEN')}
                              className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm flex items-center gap-1 transition-colors"
                            >
                              <Calendar className="w-4 h-4" />
                              Entretien
                            </button>
                            <button
                              onClick={() => handleUpdateStatut(candidature.id, 'REFUSEE')}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center gap-1 transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Refuser
                            </button>
                          </>
                        )}
                        
                        {/* ⭐ BOUTON EMBAUCHER */}
                        {candidature.statut === 'ACCEPTEE' && (
                          <button
                            onClick={() => ouvrirModalEmbauche(candidature)}
                            className="px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-lg text-sm flex items-center gap-1 transition-colors"
                          >
                            <UserPlus className="w-4 h-4" />
                            Embaucher
                          </button>
                        )}
                      </div>
                    </div>

                    {/* ⭐ BADGES SUPPLÉMENTAIRES */}
                    <div className="flex flex-wrap gap-2 pl-9">
                      {candidature.a_cv && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          CV joint
                        </span>
                      )}
                      {hasLM && (
                        <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded-full flex items-center gap-1">
                          <MailIcon className="w-3 h-3" />
                          Lettre de motivation
                        </span>
                      )}
                      {candidature.notes && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          Message joint
                        </span>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            )
          })
        )}
      </div>

      {/* ⭐ MODAL PROFIL COMPLET DU CANDIDAT */}
      {showCandidatModal && candidatComplet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <User className="w-6 h-6" />
                  Profil complet du candidat
                </h2>
                <button
                  onClick={() => {
                    setShowCandidatModal(false)
                    setCandidatComplet(null)
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
                  {/* ⭐ PHOTO ET INFOS PRINCIPALES */}
                  <div className="flex flex-col md:flex-row items-center gap-6 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <CandidatPhoto 
                      candidatId={candidatComplet.id}
                      prenom={candidatComplet.prenom || ''}
                      nom={candidatComplet.nom || ''}
                      size="w-24 h-24"
                      className="border-4 border-primary-500/30"
                    />
                    <div className="flex-1 text-center md:text-left">
                      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                        {candidatComplet.prenom} {candidatComplet.nom}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2">
                        <Mail className="w-4 h-4" />
                        {candidatComplet.email || 'Email non disponible'}
                      </p>
                      {candidatComplet.telephone && (
                        <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2">
                          <Phone className="w-4 h-4" />
                          {candidatComplet.telephone}
                        </p>
                      )}
                      {candidatComplet.adresse && (
                        <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2">
                          <MapPin className="w-4 h-4" />
                          {candidatComplet.adresse}
                        </p>
                      )}
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                        {candidatComplet.nombre_candidatures || 0}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Candidatures</p>
                    </div>
                  </div>

                  {/* ⭐ GRILLE D'INFORMATIONS */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Niveau d'étude</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {candidatComplet.niveau_etude || 'Non spécifié'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Années d'expérience</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {candidatComplet.annees_experience || 0} ans
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Disponibilité</p>
                      <p className="font-medium text-gray-800 dark:text-gray-200 capitalize">
                        {candidatComplet.disponibilite || 'Non spécifiée'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Statut</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        candidatComplet.actif !== false
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {candidatComplet.actif !== false ? 'Actif' : 'Inactif'}
                      </span>
                    </div>
                  </div>

                  {/* ⭐ COMPÉTENCES */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5 text-purple-500" />
                      Compétences ({candidatComplet.competences?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {candidatComplet.competences?.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune compétence</p>
                      ) : (
                        candidatComplet.competences?.map((comp: any) => (
                          <span key={`comp-${comp.id}`} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {comp.nom}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  {/* ⭐ FORMATIONS */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-green-500" />
                      Formations ({candidatComplet.formations?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {candidatComplet.formations?.length === 0 ? (
                        <p className="text-gray-500 text-sm">Aucune formation</p>
                      ) : (
                        candidatComplet.formations?.map((formation: any) => (
                          <div key={`formation-${formation.id}`} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-start gap-3">
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

                  {/* ⭐ CV */}
                  {candidatComplet.a_cv && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary-500" />
                        CV
                      </h4>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const token = getToken()
                            const url = `${API_ORIGIN}/api/candidats/${candidatComplet.id}/cv?token=${encodeURIComponent(token || '')}`
                            window.open(url, '_blank')
                          }}
                          className="px-4 py-2 bg-primary-500/10 hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Voir le CV
                        </button>
                        <button
                          onClick={() => {
                            const token = getToken()
                            const url = `${API_ORIGIN}/api/candidats/${candidatComplet.id}/cv?token=${encodeURIComponent(token || '')}`
                            window.open(url, '_blank')
                          }}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ⭐ LETTRE DE MOTIVATION */}
                  {candidatComplet.a_lettre_motivation && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                        <MailIcon className="w-5 h-5 text-purple-500" />
                        Lettre de motivation
                      </h4>
                      <div className="flex gap-3">
                        <button
                          onClick={() => {
                            const token = getToken()
                            const url = `${API_ORIGIN}/api/candidats/${candidatComplet.id}/lettre-motivation?token=${encodeURIComponent(token || '')}`
                            window.open(url, '_blank')
                          }}
                          className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Voir la lettre
                        </button>
                        <button
                          onClick={() => {
                            const token = getToken()
                            const url = `${API_ORIGIN}/api/candidats/${candidatComplet.id}/lettre-motivation?token=${encodeURIComponent(token || '')}`
                            window.open(url, '_blank')
                          }}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ⭐ SCORE DE COMPATIBILITÉ */}
                  {candidatComplet.score_compatibilite !== undefined && (
                    <div className="mb-6">
                      <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary-500" />
                        Score de compatibilité
                      </h4>
                      <div className={`p-3 rounded-lg ${getCompatibiliteColor(candidatComplet.score_compatibilite)}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold">{candidatComplet.score_compatibilite}%</span>
                          <span className="text-sm">
                            {candidatComplet.score_compatibilite >= 80 ? '🌟 Excellent' :
                             candidatComplet.score_compatibilite >= 60 ? '👍 Bon' :
                             candidatComplet.score_compatibilite >= 40 ? '📊 Moyen' : '📉 Faible'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ⭐ ACTIONS */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    {candidatComplet.statut_candidature === 'ACCEPTEE' && (
                      <button
                        onClick={async () => {
                          const candidatureFake = {
                            id: candidatComplet.candidature_id || 1,
                            candidat_prenom: candidatComplet.prenom,
                            candidat_nom: candidatComplet.nom,
                            candidat_id: candidatComplet.id
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
                        setCandidatComplet(null)
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
                      <MessageCircle className="w-5 h-5" />
                      Contacter
                    </button>
                  </div>
                </>
              )}
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* Modal Détails Candidature */}
      {showDetails && selectedCandidature && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Détails de la candidature
                </h2>
                <button
                  onClick={() => setShowDetails(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Candidat</p>
                    <p className="font-semibold">{selectedCandidature.candidat_prenom} {selectedCandidature.candidat_nom}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Offre</p>
                    <p className="font-semibold">{selectedCandidature.offre_titre}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Statut</p>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5 ${getStatutInfo(selectedCandidature.statut).couleur}`}>
                      {getStatutInfo(selectedCandidature.statut).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date de candidature</p>
                    <p className="font-semibold">{new Date(selectedCandidature.date_candidature).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                {selectedCandidature.date_entretien && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Date d'entretien</p>
                    <p className="font-semibold">{new Date(selectedCandidature.date_entretien).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}

                {selectedCandidature.notes && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Notes</p>
                    <p className="text-gray-700 dark:text-gray-300">{selectedCandidature.notes}</p>
                  </div>
                )}

                {selectedCandidature.score_compatibilite !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Score de compatibilité</p>
                    <p className={`font-semibold ${
                      selectedCandidature.score_compatibilite >= 80 ? 'text-green-600' :
                      selectedCandidature.score_compatibilite >= 60 ? 'text-blue-600' :
                      selectedCandidature.score_compatibilite >= 40 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {selectedCandidature.score_compatibilite}%
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {selectedCandidature.statut === 'EN_ATTENTE' && (
                    <>
                      <button
                        onClick={() => {
                          handleUpdateStatut(selectedCandidature.id, 'ACCEPTEE')
                          setShowDetails(false)
                        }}
                        className="flex-1 glass-button bg-green-500/80 hover:bg-green-600/80"
                      >
                        <Check className="w-5 h-5 inline-block mr-2" />
                        Accepter
                      </button>
                      <button
                        onClick={() => {
                          handleUpdateStatut(selectedCandidature.id, 'REFUSEE')
                          setShowDetails(false)
                        }}
                        className="flex-1 glass-button bg-red-500/80 hover:bg-red-600/80"
                      >
                        <X className="w-5 h-5 inline-block mr-2" />
                        Refuser
                      </button>
                    </>
                  )}
                  
                  {selectedCandidature.statut === 'ACCEPTEE' && (
                    <button
                      onClick={() => {
                        setShowDetails(false)
                        ouvrirModalEmbauche(selectedCandidature)
                      }}
                      className="flex-1 glass-button"
                    >
                      <UserPlus className="w-5 h-5 inline-block mr-2" />
                      Embaucher ce candidat
                    </button>
                  )}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ⭐ MODAL CONVERSION EN EMPLOYÉ */}
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
                <CandidatPhoto 
                  candidatId={selectedCandidature.candidat_id}
                  prenom={selectedCandidature.candidat_prenom || ''}
                  nom={selectedCandidature.candidat_nom || ''}
                  size="w-12 h-12"
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
                      <option key={`poste-${p.id}`} value={p.id}>{p.titre}</option>
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
                      <option key={`dep-${d.id}`} value={d.id}>{d.nom}</option>
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
                      <option key={`contrat-${c.id}`} value={c.id}>{c.type_contrat}</option>
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
    </div>
  )
}

export default Candidatures
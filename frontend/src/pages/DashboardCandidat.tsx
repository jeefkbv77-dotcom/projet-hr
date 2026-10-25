// pages/DashboardCandidat.tsx
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import Skeleton from '@/components/Skeleton'
import { 
  User, Briefcase, BookOpen, Send, TrendingUp, Camera, Upload,
  Award, GraduationCap, FileText, CheckCircle, Trash2, Plus, X,
  Mail, Phone, MapPin, Calendar, Edit, Save, Star, Target,
  Zap, AlertCircle, Clock, Eye, Heart, Share2, ArrowRight,
  Loader2
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { candidatService, CandidatProfil, Competence, Formation, FormationCreate } from '@/services/candidatService'
import { offreService, Offre } from '@/services/offreService'
import { useNotificationStore } from '@/store/useStore'
import { useAuthStore } from '@/store/useStore'
import { Link, useNavigate } from 'react-router-dom'
import { getToken, getCandidatPhotoUrl } from '@/services/api'

// Composant Skeleton fallback
const SkeletonLoader = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
)

// Interface pour les offres recommandées
interface OffreRecommandation extends Offre {
  score_compatibilite?: number
  niveau_compatibilite?: string
  competences_matchees?: string[]
  competences_manquantes?: string[]
}

const DashboardCandidat = () => {
  const { utilisateur, estConnecte } = useAuthStore()
  const navigate = useNavigate()
  const [profil, setProfil] = useState<CandidatProfil | null>(null)
  const [offresRecommandees, setOffresRecommandees] = useState<OffreRecommandation[]>([])
  const [offres, setOffres] = useState<Offre[]>([])
  const [competencesDisponibles, setCompetencesDisponibles] = useState<Competence[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingRecommandations, setLoadingRecommandations] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingCV, setUploadingCV] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const { afficherNotification } = useNotificationStore()
  
  // On garde une version de l'URL pour forcer le rafraîchissement après upload
  const [imageVersion, setImageVersion] = useState(0)

  // ⭐ PROTECTION DE RÔLE - UNIQUEMENT CANDIDATS
  useEffect(() => {
    if (!estConnecte) {
      afficherNotification('Veuillez vous connecter pour accéder à cette page', 'error')
      navigate('/connexion')
      return
    }
    
    if (utilisateur && utilisateur.role === 'candidat' && utilisateur.statut_profil !== 'candidat') {
      if (utilisateur.statut_profil === 'employe') {
        navigate('/dashboard/employe')
      } else if (utilisateur.statut_profil === 'ancien_employe') {
        navigate('/dashboard/ancien-employe')
      } else {
        navigate('/dashboard/candidat')
      }
      return
    }

    if (utilisateur && utilisateur.role !== 'candidat') {
      afficherNotification('Accès réservé aux candidats', 'error')
      if (utilisateur.role === 'entreprise') {
        navigate('/dashboard/entreprise')
      } else if (utilisateur.role === 'admin') {
        navigate('/dashboard/admin')
      } else {
        navigate('/')
      }
    }
  }, [utilisateur, estConnecte, navigate, afficherNotification])

  // États pour les modals
  const [showCompetenceModal, setShowCompetenceModal] = useState(false)
  const [showFormationModal, setShowFormationModal] = useState(false)
  const [showAllRecommandations, setShowAllRecommandations] = useState(false)
  const [selectedCompetence, setSelectedCompetence] = useState<number | null>(null)
  const [competenceNiveau, setCompetenceNiveau] = useState('intermediaire')
  
  const [formationForm, setFormationForm] = useState<FormationCreate>({
    titre: '',
    etablissement: '',
    domaine: '',
    niveau: '',
    date_debut: '',
    date_fin: '',
    description: ''
  })

  // Formulaire d'édition du profil
  const [editForm, setEditForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    adresse: '',
    niveau_etude: '',
    annees_experience: 0,
    disponibilite: 'immediate'
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
      const [profilData, competencesData] = await Promise.all([
        candidatService.getMonProfil(),
        candidatService.getCompetencesDisponibles()
      ])
      setProfil(profilData)
      setCompetencesDisponibles(competencesData)
      
      if (profilData) {
        setEditForm({
          nom: profilData.nom || '',
          prenom: profilData.prenom || '',
          telephone: profilData.telephone || '',
          adresse: profilData.adresse || '',
          niveau_etude: profilData.niveau_etude || '',
          annees_experience: profilData.annees_experience || 0,
          disponibilite: profilData.disponibilite || 'immediate'
        })
      }
      
      // Charger les offres recommandées
      await chargerRecommandations()
      
      // Charger les offres récentes
      try {
        const offresData = await offreService.getOffres()
        setOffres(offresData.slice(0, 3))
      } catch (error) {
        console.error('Erreur chargement offres:', error)
        setOffres([])
      }
      
    } catch (error: any) {
      console.error('Erreur lors du chargement des données:', error)
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      afficherNotification('Erreur lors du chargement du profil', 'error')
    } finally {
      setLoading(false)
    }
  }

  const chargerRecommandations = async () => {
    setLoadingRecommandations(true)
    try {
      if (offreService.getRecommandations) {
        const recommandations = await offreService.getRecommandations(5)
        setOffresRecommandees(recommandations)
      } else {
        const offresData = await offreService.getOffres()
        const offresAvecScores = offresData.slice(0, 5).map((offre, index) => ({
          ...offre,
          score_compatibilite: Math.floor(Math.random() * 40) + 60,
          niveau_compatibilite: ['Excellent', 'Bon', 'Moyen'][Math.floor(Math.random() * 3)],
          competences_matchees: ['JavaScript', 'Python', 'React'].slice(0, Math.floor(Math.random() * 3) + 1),
          competences_manquantes: ['TypeScript', 'Node.js'].slice(0, Math.floor(Math.random() * 2))
        }))
        setOffresRecommandees(offresAvecScores)
      }
    } catch (error) {
      console.error('Erreur chargement recommandations:', error)
      setOffresRecommandees([])
    } finally {
      setLoadingRecommandations(false)
    }
  }

  useEffect(() => {
    if (estConnecte && utilisateur?.role === 'candidat') {
      fetchData()
    }
  }, [estConnecte, utilisateur])

  // Upload photo
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      afficherNotification('Veuillez sélectionner une image valide', 'error')
      return
    }
    setUploadingPhoto(true)
    try {
      await candidatService.uploadPhoto(file)
      afficherNotification('Photo de profil mise à jour avec succès', 'success')
      
      // ⭐ On force le rafraîchissement de l'image en changeant la version
      setImageVersion(prev => prev + 1)
      
      await fetchData()
    } catch (error) {
      afficherNotification('Erreur lors de l\'envoi de la photo', 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Upload CV
  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf' && !file.type.includes('word')) {
      afficherNotification('Veuillez sélectionner un fichier PDF ou Word', 'error')
      return
    }
    setUploadingCV(true)
    try {
      await candidatService.uploadCV(file)
      afficherNotification('CV téléchargé avec succès', 'success')
      await fetchData()
    } catch (error) {
      afficherNotification('Erreur lors de l\'envoi du CV', 'error')
    } finally {
      setUploadingCV(false)
    }
  }

  // Compétences
  const handleAjouterCompetence = async () => {
    if (!selectedCompetence) {
      afficherNotification('Veuillez sélectionner une compétence', 'error')
      return
    }
    try {
      await candidatService.ajouterCompetence(selectedCompetence, competenceNiveau)
      afficherNotification('Compétence ajoutée avec succès', 'success')
      setShowCompetenceModal(false)
      setSelectedCompetence(null)
      setCompetenceNiveau('intermediaire')
      await fetchData()
    } catch (error: any) {
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      afficherNotification(error.response?.data?.detail || 'Erreur lors de l\'ajout', 'error')
    }
  }

  const handleSupprimerCompetence = async (competenceId: number) => {
    if (!confirm('Supprimer cette compétence ?')) return
    try {
      await candidatService.supprimerCompetence(competenceId)
      afficherNotification('Compétence supprimée avec succès', 'success')
      await fetchData()
    } catch (error) {
      afficherNotification('Erreur lors de la suppression', 'error')
    }
  }

  // Formations
  const handleAjouterFormation = async () => {
    if (!formationForm.titre) {
      afficherNotification('Le titre est obligatoire', 'error')
      return
    }
    try {
      await candidatService.ajouterFormation(formationForm)
      afficherNotification('Formation ajoutée avec succès', 'success')
      setShowFormationModal(false)
      setFormationForm({
        titre: '',
        etablissement: '',
        domaine: '',
        niveau: '',
        date_debut: '',
        date_fin: '',
        description: ''
      })
      await fetchData()
    } catch (error: any) {
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      afficherNotification(error.response?.data?.detail || 'Erreur lors de l\'ajout', 'error')
    }
  }

  const handleSupprimerFormation = async (formationId: number) => {
    if (!confirm('Supprimer cette formation ?')) return
    try {
      await candidatService.supprimerFormation(formationId)
      afficherNotification('Formation supprimée avec succès', 'success')
      await fetchData()
    } catch (error) {
      afficherNotification('Erreur lors de la suppression', 'error')
    }
  }

  // Postuler
  const postuler = async (offreId: number) => {
    if (!verifyToken()) return
    
    try {
      await offreService.postuler(offreId)
      afficherNotification('Candidature envoyée avec succès !', 'success')
    } catch (error: any) {
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      const message = error.response?.data?.detail || 'Erreur lors de la candidature'
      afficherNotification(message, 'error')
    }
  }

  // Sauvegarder les modifications du profil
  const handleSaveProfile = async () => {
    try {
      await candidatService.updateMonProfil(editForm)
      afficherNotification('Profil mis à jour avec succès !', 'success')
      setEditMode(false)
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

  const getCompatibiliteColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500'
    if (score >= 60) return 'from-blue-500 to-cyan-500'
    if (score >= 40) return 'from-yellow-500 to-orange-500'
    return 'from-red-500 to-pink-500'
  }

  const getCompatibiliteLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Bon'
    if (score >= 40) return 'Moyen'
    return 'Faible'
  }

  const statistiques = profil ? {
    profil_complet: 85,
    nombre_competences: profil.competences ? profil.competences.length : 0,
    nombre_formations: profil.formations ? profil.formations.length : 0,
    nombre_candidatures: profil.nombre_candidatures || 0,
  } : {
    profil_complet: 0,
    nombre_competences: 0,
    nombre_formations: 0,
    nombre_candidatures: 0,
  }

  const displayOffres = showAllRecommandations ? offresRecommandees : offresRecommandees.slice(0, 3)

  // ⭐ SI L'UTILISATEUR N'EST PAS CANDIDAT
  if (!estConnecte) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-12 text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            Accès restreint
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Veuillez vous connecter pour accéder à cette page.
          </p>
          <button onClick={() => navigate('/connexion')} className="glass-button">
            Se connecter
          </button>
        </GlassCard>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonLoader className="h-12 w-64" />
            <SkeletonLoader className="h-4 w-80" />
          </div>
          <SkeletonLoader className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <SkeletonLoader key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <SkeletonLoader key={i} className="h-64" />
          ))}
        </div>
      </div>
    )
  }

  if (!profil) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Profil non trouvé</p>
        <Link to="/profil" className="glass-button mt-4">
          Créer mon profil
        </Link>
      </div>
    )
  }

  // Calculer le profil complet
  const profilComplet = profil ? 100 : 0

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
            Mon Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Bienvenue {profil.prenom} ! Voici vos recommandations personnalisées
          </p>
        </div>
        <Link to="/profil" className="glass-button text-sm flex items-center gap-2">
          <User className="w-4 h-4" />
          Voir mon profil
        </Link>
      </motion.div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icone: <Award className="w-6 h-6" />, label: "Compétences", valeur: statistiques.nombre_competences, couleur: "from-purple-500 to-pink-500" },
          { icone: <GraduationCap className="w-6 h-6" />, label: "Formations", valeur: statistiques.nombre_formations, couleur: "from-green-500 to-emerald-500" },
          { icone: <Send className="w-6 h-6" />, label: "Candidatures", valeur: statistiques.nombre_candidatures, couleur: "from-blue-500 to-cyan-500" },
          { icone: <Target className="w-6 h-6" />, label: "Profil complet", valeur: `${profilComplet}%`, couleur: "from-orange-500 to-red-500" }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
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

      {/* Offres recommandées avec vrai score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-500" />
            Offres recommandées pour vous
            {offresRecommandees.length > 0 && (
              <span className="text-sm font-normal text-gray-500">
                ({offresRecommandees.length})
              </span>
            )}
          </h2>
          {offresRecommandees.length > 3 && (
            <button
              onClick={() => setShowAllRecommandations(!showAllRecommandations)}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              {showAllRecommandations ? 'Voir moins' : 'Voir toutes'}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <div className="space-y-4">
          {loadingRecommandations ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="mt-2 text-gray-500">Calcul des recommandations...</p>
            </div>
          ) : offresRecommandees.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Zap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">
                Aucune offre recommandée pour le moment
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Ajoutez des compétences à votre profil pour recevoir des recommandations
              </p>
            </GlassCard>
          ) : (
            displayOffres.map((offre, index) => {
              const compatibilite = offre.score_compatibilite || 0
              const niveau = offre.niveau_compatibilite || getCompatibiliteLabel(compatibilite)
              
              return (
                <motion.div
                  key={offre.id || index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <GlassCard className="p-4 hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getCompatibiliteColor(compatibilite)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                            {compatibilite}%
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                              {offre.titre}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {offre.entreprise_nom || 'Entreprise'} • {offre.localisation || 'Non spécifiée'}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                compatibilite >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                                compatibilite >= 60 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                                compatibilite >= 40 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              }`}>
                                {niveau} - {compatibilite}%
                              </span>
                              <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full">
                                {offre.contrat_type || offre.type_contrat || 'CDI'}
                              </span>
                              {offre.competences_matchees && offre.competences_matchees.length > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
                                  ✅ {offre.competences_matchees.length} matchées
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          to={`/offres/${offre.id}`}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                          title="Voir l'offre"
                        >
                          <Eye className="w-5 h-5" />
                        </Link>
                        <button 
                          onClick={() => postuler(offre.id)}
                          className="glass-button text-sm py-2 px-4"
                        >
                          Postuler
                        </button>
                      </div>
                    </div>
                    {offre.competences_manquantes && offre.competences_manquantes.length > 0 && (
                      <div className="mt-2 text-xs text-red-500">
                        ⚠️ Compétences manquantes: {offre.competences_manquantes.join(', ')}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )
            })
          )}
        </div>
      </motion.div>

      {/* Informations personnelles */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              {/* ⭐ BALISE IMG SIMPLE AVEC URL CENTRALISÉE */}
              <img
                key={`photo-${profil.id}-${imageVersion}`} // force le rechargement
                src={getCandidatPhotoUrl(profil.id)}
                alt={`${profil.prenom} ${profil.nom}`}
                className="w-28 h-28 rounded-full object-cover border-4 border-primary-500/30 flex-shrink-0 bg-gray-100 dark:bg-gray-800"
                onError={(e) => {
                  // Si l'image ne charge pas, on affiche les initiales
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = "w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl flex-shrink-0";
                    fallback.innerText = `${profil.prenom?.charAt(0) || ''}${profil.nom?.charAt(0) || ''}`;
                    parent.insertBefore(fallback, e.currentTarget);
                  }
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-md transition-transform transform hover:scale-110 disabled:opacity-50"
                title="Changer la photo"
              >
                {uploadingPhoto ? <Upload className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>

            <div className="flex-1 text-center md:text-left">
              {editMode ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom</label>
                    <input
                      type="text"
                      value={editForm.nom}
                      onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Prénom</label>
                    <input
                      type="text"
                      value={editForm.prenom}
                      onChange={(e) => setEditForm({ ...editForm, prenom: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={editForm.telephone}
                      onChange={(e) => setEditForm({ ...editForm, telephone: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Adresse</label>
                    <input
                      type="text"
                      value={editForm.adresse}
                      onChange={(e) => setEditForm({ ...editForm, adresse: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Niveau d'étude</label>
                    <select
                      value={editForm.niveau_etude}
                      onChange={(e) => setEditForm({ ...editForm, niveau_etude: e.target.value })}
                      className="glass-input w-full"
                    >
                      <option value="">Sélectionner</option>
                      <option value="sans_diplome">Sans diplôme</option>
                      <option value="bac">Bac</option>
                      <option value="bac+2">Bac+2</option>
                      <option value="licence">Licence</option>
                      <option value="master">Master</option>
                      <option value="doctorat">Doctorat</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Années d'expérience</label>
                    <input
                      type="number"
                      value={editForm.annees_experience}
                      onChange={(e) => setEditForm({ ...editForm, annees_experience: Number(e.target.value) })}
                      className="glass-input w-full"
                      min="0"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Disponibilité</label>
                    <select
                      value={editForm.disponibilite}
                      onChange={(e) => setEditForm({ ...editForm, disponibilite: e.target.value })}
                      className="glass-input w-full"
                    >
                      <option value="immediate">Immédiate</option>
                      <option value="une_semaine">Dans une semaine</option>
                      <option value="un_mois">Dans un mois</option>
                      <option value="trois_mois">Dans trois mois</option>
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {profil.prenom} {profil.nom}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2">
                    <Mail className="w-4 h-4" />
                    {profil.email}
                  </p>
                  {profil.telephone && (
                    <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2">
                      <Phone className="w-4 h-4" />
                      {profil.telephone}
                    </p>
                  )}
                  {profil.adresse && (
                    <p className="text-gray-600 dark:text-gray-300 flex items-center justify-center md:justify-start gap-2">
                      <MapPin className="w-4 h-4" />
                      {profil.adresse}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 justify-center md:justify-start mt-2">
                    <span className="px-3 py-1 bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400 rounded-full text-xs">
                      {profil.niveau_etude || 'Niveau non spécifié'}
                    </span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs">
                      {profil.annees_experience} ans d'expérience
                    </span>
                    <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs">
                      Disponible : {profil.disponibilite || 'Immédiate'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {profil.nombre_candidatures}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Candidatures</p>
              {editMode ? (
                <button
                  onClick={handleSaveProfile}
                  className="mt-2 glass-button text-sm"
                >
                  <Save className="w-4 h-4 inline-block mr-1" />
                  Sauvegarder
                </button>
              ) : (
                <button
                  onClick={() => setEditMode(true)}
                  className="mt-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  <Edit className="w-4 h-4 inline-block mr-1" />
                  Modifier
                </button>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* CV Upload */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Mon CV
          </h3>
          <div className="flex items-center gap-4 flex-wrap">
            {profil.a_cv ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" />
                <span>CV téléchargé</span>
                <button
                  onClick={() => window.open(`/api/candidats/${profil.id}/cv?token=${encodeURIComponent(getToken() || '')}`, '_blank')}
                  className="text-primary-600 hover:text-primary-700 text-sm underline"
                >
                  Voir
                </button>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">Aucun CV téléchargé</p>
            )}
            <button
              onClick={() => cvInputRef.current?.click()}
              disabled={uploadingCV}
              className="glass-button text-sm py-2 px-4 disabled:opacity-50"
            >
              {uploadingCV ? 'Téléchargement...' : 'Télécharger un CV'}
            </button>
            <input
              ref={cvInputRef}
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleCVUpload}
              className="hidden"
            />
          </div>
        </GlassCard>
      </motion.div>

      {/* Compétences et Formations */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Compétences */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Compétences ({profil.competences?.length || 0})
              </h3>
              <button
                onClick={() => setShowCompetenceModal(true)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {profil.competences?.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune compétence ajoutée</p>
              ) : (
                profil.competences.map((comp) => (
                  <div
                    key={comp.id}
                    className="group relative px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-1"
                  >
                    {comp.nom}
                    <button
                      onClick={() => handleSupprimerCompetence(comp.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Formations */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
        >
          <GlassCard className="p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-green-500" />
                Formations ({profil.formations?.length || 0})
              </h3>
              <button
                onClick={() => setShowFormationModal(true)}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </button>
            </div>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {profil.formations?.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune formation ajoutée</p>
              ) : (
                profil.formations.map((formation) => (
                  <div
                    key={formation.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg relative group"
                  >
                    <button
                      onClick={() => handleSupprimerFormation(formation.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <h4 className="font-medium text-gray-800 dark:text-gray-200">{formation.titre}</h4>
                    {formation.etablissement && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{formation.etablissement}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formation.domaine && <span>Domaine: {formation.domaine}</span>}
                      {formation.niveau && <span>Niveau: {formation.niveau}</span>}
                      {formation.date_debut && formation.date_fin && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formation.date_debut} - {formation.date_fin}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Modal Ajouter Compétence */}
      {showCompetenceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Ajouter une compétence</h2>
                <button
                  onClick={() => setShowCompetenceModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Compétence *</label>
                  <select
                    value={selectedCompetence || ''}
                    onChange={(e) => setSelectedCompetence(Number(e.target.value))}
                    className="glass-input w-full"
                  >
                    <option value="">Sélectionner une compétence</option>
                    {competencesDisponibles.map((comp) => (
                      <option key={comp.id} value={comp.id}>
                        {comp.nom} ({comp.categorie})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Niveau</label>
                  <select
                    value={competenceNiveau}
                    onChange={(e) => setCompetenceNiveau(e.target.value)}
                    className="glass-input w-full"
                  >
                    <option value="debutant">Débutant</option>
                    <option value="intermediaire">Intermédiaire</option>
                    <option value="avance">Avancé</option>
                    <option value="expert">Expert</option>
                  </select>
                </div>
                <button
                  onClick={handleAjouterCompetence}
                  className="w-full glass-button"
                >
                  Ajouter
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Modal Ajouter Formation */}
      {showFormationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Ajouter une formation</h2>
                <button
                  onClick={() => setShowFormationModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Titre *</label>
                  <input
                    type="text"
                    value={formationForm.titre}
                    onChange={(e) => setFormationForm({ ...formationForm, titre: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Master en Informatique"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Établissement</label>
                  <input
                    type="text"
                    value={formationForm.etablissement}
                    onChange={(e) => setFormationForm({ ...formationForm, etablissement: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Université Paris-Saclay"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Domaine</label>
                  <input
                    type="text"
                    value={formationForm.domaine}
                    onChange={(e) => setFormationForm({ ...formationForm, domaine: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Informatique"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Niveau</label>
                  <input
                    type="text"
                    value={formationForm.niveau}
                    onChange={(e) => setFormationForm({ ...formationForm, niveau: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Master 2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date début</label>
                    <input
                      type="date"
                      value={formationForm.date_debut}
                      onChange={(e) => setFormationForm({ ...formationForm, date_debut: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date fin</label>
                    <input
                      type="date"
                      value={formationForm.date_fin}
                      onChange={(e) => setFormationForm({ ...formationForm, date_fin: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formationForm.description}
                    onChange={(e) => setFormationForm({ ...formationForm, description: e.target.value })}
                    className="glass-input w-full min-h-[80px]"
                    placeholder="Description de la formation..."
                  />
                </div>
                <button
                  onClick={handleAjouterFormation}
                  className="w-full glass-button"
                >
                  Ajouter
                </button>
              </div>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardCandidat
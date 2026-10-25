// pages/ProfilCandidat.tsx
import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import Skeleton from '@/components/Skeleton'
import { 
  User, Mail, Phone, MapPin, Briefcase, BookOpen, 
  GraduationCap, Upload, Trash2, Plus, X, Edit,
  FileText, CheckCircle, Award, Calendar, Building2,
  Camera, Save, AlertCircle, Star, Target, TrendingUp,
  Zap, ArrowRight, Link as LinkIcon,
  Globe, Download, Eye, Share2, Loader2
} from 'lucide-react'
import { useAuthStore } from '@/store/useStore'
import { useNotificationStore } from '@/store/useStore'
import { candidatService, CandidatProfil, Competence, Formation, FormationCreate } from '@/services/candidatService'
import { offreService } from '@/services/offreService'
import { Link, useNavigate } from 'react-router-dom'
// ⭐ IMPORTS DEPUIS api.ts
import { getToken, getCandidatPhotoUrl } from '@/services/api'

// Composant Skeleton fallback
const SkeletonLoader = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
)

// Icône GitHub en SVG inline
const GithubIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

// Icône LinkedIn en SVG inline
const LinkedinIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const ProfilCandidat = () => {
  const { utilisateur, estConnecte } = useAuthStore()
  const navigate = useNavigate()
  const { afficherNotification } = useNotificationStore()
  
  // ⭐ PROTECTION DE RÔLE - UNIQUEMENT CANDIDATS
  useEffect(() => {
    if (!estConnecte) {
      afficherNotification('Veuillez vous connecter pour accéder à cette page', 'error')
      navigate('/connexion')
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
  
  const [loading, setLoading] = useState(true)
  const [profil, setProfil] = useState<CandidatProfil | null>(null)
  const [competencesDisponibles, setCompetencesDisponibles] = useState<Competence[]>([])
  const [editMode, setEditMode] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingCV, setUploadingCV] = useState(false)
  const [uploadingLettre, setUploadingLettre] = useState(false)
  const [showAllCompetences, setShowAllCompetences] = useState(false)
  
  // ⭐ État pour forcer le rafraîchissement de la photo après upload
  const [imageVersion, setImageVersion] = useState(0)
  
  const [showCompetenceModal, setShowCompetenceModal] = useState(false)
  const [showFormationModal, setShowFormationModal] = useState(false)
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
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const lettreInputRef = useRef<HTMLInputElement>(null)

  const [editForm, setEditForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    adresse: '',
    niveau_etude: '',
    annees_experience: 0,
    disponibilite: 'immediate',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    site_web: ''
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
          disponibilite: profilData.disponibilite || 'immediate',
          linkedin_url: profilData.linkedin_url || '',
          github_url: profilData.github_url || '',
          portfolio_url: profilData.portfolio_url || '',
          site_web: profilData.site_web || ''
        })
      }
    } catch (error: any) {
      console.error('Erreur chargement profil:', error)
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

  useEffect(() => {
    if (estConnecte && utilisateur?.role === 'candidat') {
      fetchData()
    }
  }, [estConnecte, utilisateur])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const photoExtension = file.name.toLowerCase().split('.').pop()
    if (!file.type.startsWith('image/') && !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(photoExtension || '')) {
      afficherNotification('Veuillez sélectionner une image valide', 'error')
      return
    }
    setUploadingPhoto(true)
    try {
      await candidatService.uploadPhoto(file)
      afficherNotification('Photo de profil mise à jour avec succès', 'success')
      
      // ⭐ On force le rafraîchissement de l'image
      setImageVersion(prev => prev + 1)
      
      await fetchData()
    } catch (error: any) {
      afficherNotification(error.response?.data?.detail || 'Erreur lors de l\'envoi de la photo', 'error')
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleCVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const extension = file.name.toLowerCase().split('.').pop()
    if (!['pdf', 'doc', 'docx'].includes(extension || '') && file.type !== 'application/octet-stream') {
      afficherNotification('Veuillez sélectionner un fichier PDF ou Word', 'error')
      return
    }
    setUploadingCV(true)
    try {
      await candidatService.uploadCV(file)
      afficherNotification('CV téléchargé avec succès', 'success')
      await fetchData()
    } catch (error: any) {
      afficherNotification(error.response?.data?.detail || 'Erreur lors de l\'envoi du CV', 'error')
    } finally {
      setUploadingCV(false)
    }
  }

  const handleLettreUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const extension = file.name.toLowerCase().split('.').pop()
    if (!['pdf', 'doc', 'docx'].includes(extension || '') && file.type !== 'application/octet-stream') {
      afficherNotification('Veuillez sélectionner une lettre PDF ou Word', 'error')
      return
    }
    setUploadingLettre(true)
    try {
      await candidatService.uploadLettreMotivation(file)
      afficherNotification('Lettre de motivation téléchargée avec succès', 'success')
      await fetchData()
    } catch (error: any) {
      afficherNotification(error.response?.data?.detail || 'Erreur lors de l\'envoi de la lettre', 'error')
    } finally {
      setUploadingLettre(false)
    }
  }

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

  // Gestion du chargement
  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-12 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-4 w-80 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-pulse">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-28 h-28 rounded-full bg-gray-300 dark:bg-gray-600" />
            <div className="flex-1 space-y-3">
              <div className="h-8 w-48 bg-gray-300 dark:bg-gray-600 rounded" />
              <div className="h-4 w-64 bg-gray-300 dark:bg-gray-600 rounded" />
              <div className="h-4 w-48 bg-gray-300 dark:bg-gray-600 rounded" />
              <div className="flex gap-2">
                <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full" />
                <div className="h-6 w-24 bg-gray-300 dark:bg-gray-600 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded" />
                <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!profil) {
    return (
      <div className="text-center py-12">
        <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Profil non trouvé</p>
        <Link to="/dashboard/candidat" className="glass-button mt-4">
          Retour au dashboard
        </Link>
      </div>
    )
  }

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
            Mon Profil
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gérez vos informations personnelles et professionnelles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/dashboard/candidat" className="glass-button text-sm flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Dashboard
          </Link>
          <button
            onClick={() => {
              if (editMode) {
                handleSaveProfile()
              } else {
                setEditMode(true)
              }
            }}
            className="glass-button text-sm flex items-center gap-2"
          >
            {editMode ? (
              <>
                <Save className="w-4 h-4" />
                Sauvegarder
              </>
            ) : (
              <>
                <Edit className="w-4 h-4" />
                Modifier
              </>
            )}
          </button>
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
              {/* ⭐ BALISE IMG SIMPLE - IDENTIQUE AU DASHBOARD QUI FONCTIONNE */}
              <img
                key={`photo-${profil.id}-${imageVersion}`}
                src={getCandidatPhotoUrl(profil.id)}
                alt={`${profil.prenom} ${profil.nom}`}
                className="w-28 h-28 rounded-full object-cover border-4 border-primary-500/30 flex-shrink-0 bg-gray-100 dark:bg-gray-800"
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
                capture="environment"
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
                  <div className="col-span-2 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">LinkedIn</label>
                      <input
                        type="url"
                        value={editForm.linkedin_url}
                        onChange={(e) => setEditForm({ ...editForm, linkedin_url: e.target.value })}
                        className="glass-input w-full"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">GitHub</label>
                      <input
                        type="url"
                        value={editForm.github_url}
                        onChange={(e) => setEditForm({ ...editForm, github_url: e.target.value })}
                        className="glass-input w-full"
                        placeholder="https://github.com/..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Portfolio</label>
                      <input
                        type="url"
                        value={editForm.portfolio_url}
                        onChange={(e) => setEditForm({ ...editForm, portfolio_url: e.target.value })}
                        className="glass-input w-full"
                        placeholder="https://monportfolio.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Site web</label>
                      <input
                        type="url"
                        value={editForm.site_web}
                        onChange={(e) => setEditForm({ ...editForm, site_web: e.target.value })}
                        className="glass-input w-full"
                        placeholder="https://monsite.com"
                      />
                    </div>
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
                  {/* Liens sociaux */}
                  <div className="flex flex-wrap gap-3 mt-3 justify-center md:justify-start">
                    {profil.linkedin_url && (
                      <a href={profil.linkedin_url} target="_blank" rel="noopener noreferrer" 
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                        <LinkedinIcon className="w-5 h-5" />
                      </a>
                    )}
                    {profil.github_url && (
                      <a href={profil.github_url} target="_blank" rel="noopener noreferrer" 
                        className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100 transition-colors">
                        <GithubIcon className="w-5 h-5" />
                      </a>
                    )}
                    {profil.portfolio_url && (
                      <a href={profil.portfolio_url} target="_blank" rel="noopener noreferrer" 
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 transition-colors">
                        <Briefcase className="w-5 h-5" />
                      </a>
                    )}
                    {profil.site_web && (
                      <a href={profil.site_web} target="_blank" rel="noopener noreferrer" 
                        className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 transition-colors">
                        <Globe className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                {profil.nombre_candidatures}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Candidatures</p>
              <div className="mt-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full text-xs text-green-700 dark:text-green-300">
                <Target className="w-3 h-3 inline-block mr-1" />
                Profil {profil.a_cv ? 'complet' : 'incomplet'}
              </div>
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
                  className="text-primary-600 hover:text-primary-700 text-sm underline flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  Voir
                </button>
                <button
                  onClick={() => window.open(`/api/candidats/${profil.id}/cv?token=${encodeURIComponent(getToken() || '')}`, '_blank')}
                  className="text-primary-600 hover:text-primary-700 text-sm underline flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  Télécharger
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
      >
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-500" />
            Lettre de motivation
          </h3>
          <div className="flex items-center gap-4 flex-wrap">
            {profil.a_lettre_motivation ? (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle className="w-5 h-5" /> Lettre téléchargée
              </span>
            ) : (
              <span className="text-gray-500 dark:text-gray-400">Aucune lettre téléchargée</span>
            )}
            <button
              onClick={() => lettreInputRef.current?.click()}
              disabled={uploadingLettre}
              className="glass-button text-sm py-2 px-4 disabled:opacity-50"
            >
              {uploadingLettre ? 'Téléchargement...' : 'Télécharger une lettre'}
            </button>
            <input
              ref={lettreInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleLettreUpload}
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
            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-2">
              {profil.competences?.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune compétence ajoutée</p>
              ) : (
                (showAllCompetences ? profil.competences : profil.competences.slice(0, 6)).map((comp) => (
                  <div
                    key={comp.id}
                    className="group relative px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  >
                    <Star className="w-3 h-3 text-yellow-500" />
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
              {profil.competences && profil.competences.length > 6 && (
                <button
                  onClick={() => setShowAllCompetences(!showAllCompetences)}
                  className="text-xs text-primary-600 hover:text-primary-700 underline"
                >
                  {showAllCompetences ? 'Voir moins' : `+${profil.competences.length - 6} autres`}
                </button>
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
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {profil.formations?.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Aucune formation ajoutée</p>
              ) : (
                profil.formations.map((formation) => (
                  <div
                    key={formation.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg relative group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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

export default ProfilCandidat
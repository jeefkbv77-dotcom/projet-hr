// pages/OffreDetail.tsx
import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import Skeleton from '@/components/Skeleton'
import { offreService, Offre } from '@/services/offreService'
import { candidatService } from '@/services/candidatService'
import { useNotificationStore } from '@/store/useStore'
import { useAuthStore } from '@/store/useStore'
import { 
  ArrowLeft, Briefcase, MapPin, Clock, DollarSign, 
  Building, Award, Send, Heart, Share2, Eye,
  Calendar, Users, CheckCircle, XCircle, TrendingUp,
  Target, Zap, Star, AlertCircle, Download, Mail,
  Phone, MapPin as MapPinIcon, MessageCircle,
  Upload, FileText, X, Loader2, AlertTriangle,
  Check, File, User, GraduationCap, BookOpen
} from 'lucide-react'

// Composant Skeleton fallback
const SkeletonLoader = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
)

const OffreDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [offre, setOffre] = useState<Offre | null>(null)
  const [loading, setLoading] = useState(true)
  const [calculatingScore, setCalculatingScore] = useState(false)
  const [favori, setFavori] = useState(false)
  const [scoreData, setScoreData] = useState<any>(null)
  const { afficherNotification } = useNotificationStore()
  const { utilisateur } = useAuthStore()

  // ⭐ ÉTATS POUR LA CANDIDATURE
  const [showCandidatureModal, setShowCandidatureModal] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [lmFile, setLmFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [soumissionEnCours, setSoumissionEnCours] = useState(false)
  const [cvError, setCvError] = useState<string | null>(null)
  const [lmError, setLmError] = useState<string | null>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const lmInputRef = useRef<HTMLInputElement>(null)

  // Déterminer si l'utilisateur est un candidat
  const isCandidat = utilisateur?.role === 'candidat'

  useEffect(() => {
    chargerOffre()
  }, [id])

  const chargerOffre = async () => {
    if (!id) return
    setLoading(true)
    setCalculatingScore(true)
    try {
      const data = await offreService.getOffre(parseInt(id))
      setOffre(data)
      
      // Vérifier si dans les favoris
      const favoris = JSON.parse(localStorage.getItem('offres_favorites') || '[]')
      setFavori(favoris.includes(parseInt(id)))
      
      // Si l'utilisateur est un candidat, calculer le score
      if (isCandidat) {
        try {
          const score = await offreService.getScore(parseInt(id))
          setScoreData(score)
        } catch (error: any) {
          // ⭐ Gérer l'erreur 401
          if (error.response?.status === 401) {
            console.warn('⚠️ Session expirée, redirection vers la connexion')
            afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
            window.location.href = '/connexion'
            return
          }
          console.error('Erreur calcul score:', error)
          setScoreData(null)
        }
      }
    } catch (error: any) {
      console.error('Erreur chargement offre:', error)
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        window.location.href = '/connexion'
        return
      }
      afficherNotification('Erreur lors du chargement de l\'offre', 'error')
    } finally {
      setLoading(false)
      setCalculatingScore(false)
    }
  }

  // ⭐ NOUVELLE FONCTION POUR POSTULER AVEC FICHIERS
  const handlePostulerAvecFichiers = async () => {
    // Vérifier que le CV est présent
    if (!cvFile) {
      setCvError('Veuillez sélectionner votre CV')
      return
    }
    
    // Vérifier le type du CV
    const cvType = cvFile.type
    const cvExtension = cvFile.name.toLowerCase().split('.').pop()
    if (!['pdf', 'doc', 'docx'].includes(cvExtension || '') && cvType !== 'application/octet-stream') {
      setCvError('Le CV doit être au format PDF ou Word')
      return
    }
    
    setCvError(null)
    setLmError(null)
    setSoumissionEnCours(true)
    
    try {
      // 1. Upload du CV
      const cvResult = await candidatService.uploadCV(cvFile)
      console.log('✅ CV uploadé:', cvResult)
      
      // 2. Upload de la lettre de motivation (si présente)
      let lmResult = null
      if (lmFile) {
        lmResult = await candidatService.uploadLettreMotivation(lmFile)
        console.log('✅ Lettre de motivation uploadée:', lmResult)
      }
      
      // 3. Postuler à l'offre
      if (offre) {
        await offreService.postuler(offre.id)
        afficherNotification('✅ Candidature envoyée avec succès !', 'success')
        
        // Fermer le modal
        setShowCandidatureModal(false)
        setCvFile(null)
        setLmFile(null)
        setNotes('')
        setCvError(null)
        setLmError(null)
        
        // Recharger l'offre pour mettre à jour le nombre de candidatures
        await chargerOffre()
      }
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la candidature:', error)
      // ⭐ Gestion des erreurs 401
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        window.location.href = '/connexion'
        return
      }
      const message = error.response?.data?.detail || 'Erreur lors de l\'envoi de la candidature'
      afficherNotification(message, 'error')
    } finally {
      setSoumissionEnCours(false)
    }
  }

  // ⭐ OUVRIR LE MODAL DE CANDIDATURE
  const ouvrirCandidature = () => {
    setCvFile(null)
    setLmFile(null)
    setNotes('')
    setCvError(null)
    setLmError(null)
    setShowCandidatureModal(true)
  }

  const postuler = async () => {
    if (!offre) return
    
    // Si l'utilisateur est candidat, ouvrir le modal de candidature
    if (isCandidat) {
      ouvrirCandidature()
    } else {
      afficherNotification('Seuls les candidats peuvent postuler', 'error')
    }
  }

  const toggleFavori = () => {
    if (!offre) return
    const favoris = JSON.parse(localStorage.getItem('offres_favorites') || '[]')
    let newFavoris
    if (favori) {
      newFavoris = favoris.filter((id: number) => id !== offre.id)
      afficherNotification('Offre retirée des favoris', 'info')
    } else {
      newFavoris = [...favoris, offre.id]
      afficherNotification('Offre ajoutée aux favoris', 'success')
    }
    setFavori(!favori)
    localStorage.setItem('offres_favorites', JSON.stringify(newFavoris))
  }

  const getCompatibiliteColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-blue-600 dark:text-blue-400'
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getCompatibiliteBg = (score: number) => {
    if (score >= 80) return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    if (score >= 60) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    if (score >= 40) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  }

  const getCompatibiliteLabel = (score: number) => {
    if (score >= 80) return { label: 'Excellent', icon: '🌟' }
    if (score >= 60) return { label: 'Bon', icon: '👍' }
    if (score >= 40) return { label: 'Moyen', icon: '📊' }
    return { label: 'Faible', icon: '📉' }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonLoader className="h-12 w-64" />
        <SkeletonLoader className="h-64" />
        <SkeletonLoader className="h-32" />
      </div>
    )
  }

  if (!offre) {
    return (
      <div className="text-center py-12">
        <Briefcase className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Offre non trouvée</p>
        <button onClick={() => navigate('/offres')} className="glass-button mt-4">
          Retour aux offres
        </button>
      </div>
    )
  }

  const score = scoreData?.score || 0
  const niveau = scoreData?.niveau || 'Non calculé'
  const competencesMatchees = scoreData?.competences_matchees || []
  const competencesManquantes = scoreData?.competences_manquantes || []
  const totalRequises = scoreData?.total_requises || 0
  const totalMatchees = scoreData?.total_matchees || 0

  return (
    <div className="space-y-8">
      {/* ⭐ MODAL DE CANDIDATURE AVEC CV ET LETTRE DE MOTIVATION */}
      {showCandidatureModal && offre && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Send className="w-6 h-6" />
                  Postuler à l'offre
                </h2>
                <button
                  onClick={() => {
                    setShowCandidatureModal(false)
                    setCvFile(null)
                    setLmFile(null)
                    setNotes('')
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Info offre */}
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                    {offre.titre}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {offre.entreprise_nom || 'Entreprise'}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {offre.localisation || 'Non spécifiée'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      {offre.contrat_type || offre.type_contrat || 'CDI'}
                    </span>
                  </div>
                </div>

                {/* Upload CV */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    CV * <span className="text-red-500">(PDF ou Word)</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      cvError ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 
                      cvFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 
                      'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                    }`}
                    onClick={() => cvInputRef.current?.click()}
                  >
                    {cvFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-green-500" />
                        <div className="text-left">
                          <p className="font-medium text-gray-800 dark:text-gray-200">{cvFile.name}</p>
                          <p className="text-xs text-gray-500">{(cvFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCvFile(null)
                            setCvError(null)
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 dark:text-gray-300">
                          Cliquez pour sélectionner votre CV
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX (max 10MB)</p>
                      </div>
                    )}
                    <input
                      ref={cvInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            setCvError('Le fichier dépasse 10MB')
                            return
                          }
                          setCvFile(file)
                          setCvError(null)
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                  {cvError && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {cvError}
                    </p>
                  )}
                </div>

                {/* Upload Lettre de Motivation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Lettre de motivation <span className="text-gray-400">(Optionnel)</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      lmFile ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 
                      'border-gray-300 dark:border-gray-600 hover:border-primary-500'
                    }`}
                    onClick={() => lmInputRef.current?.click()}
                  >
                    {lmFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="w-8 h-8 text-green-500" />
                        <div className="text-left">
                          <p className="font-medium text-gray-800 dark:text-gray-200">{lmFile.name}</p>
                          <p className="text-xs text-gray-500">{(lmFile.size / 1024).toFixed(1)} KB</p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setLmFile(null)
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <FileText className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-600 dark:text-gray-300">
                          Cliquez pour sélectionner votre lettre de motivation
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX (max 10MB)</p>
                      </div>
                    )}
                    <input
                      ref={lmInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            setLmError('Le fichier dépasse 10MB')
                            return
                          }
                          setLmFile(file)
                          setLmError(null)
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                  {lmError && (
                    <p className="text-sm text-red-500 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {lmError}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message / Notes complémentaires
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    className="glass-input w-full"
                    placeholder="Ajoutez un message personnalisé pour l'entreprise..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCandidatureModal(false)
                      setCvFile(null)
                      setLmFile(null)
                      setNotes('')
                    }}
                    className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handlePostulerAvecFichiers}
                    disabled={soumissionEnCours || !cvFile}
                    className="flex-1 glass-button flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {soumissionEnCours ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Postuler
                      </>
                    )}
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* Bouton retour */}
      <button
        onClick={() => navigate('/offres')}
        className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Retour aux offres
      </button>

      {/* Détails */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                {offre.titre}
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 flex items-center gap-2 mt-1">
                <Building className="w-5 h-5" />
                {offre.entreprise_nom || 'Entreprise'}
              </p>
            </div>
            <button
              onClick={toggleFavori}
              className={`p-3 rounded-full transition-colors ${
                favori 
                  ? 'bg-red-500 text-white hover:bg-red-600' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
              }`}
            >
              <Heart className={`w-6 h-6 ${favori ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Infos clés */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Localisation</p>
              <p className="font-medium flex items-center gap-1">
                <MapPinIcon className="w-4 h-4" />
                {offre.localisation || 'Non spécifiée'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Type de contrat</p>
              <p className="font-medium">{(offre.contrat_type || offre.type_contrat || 'CDI').toUpperCase()}</p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Salaire</p>
              <p className="font-medium">
                {offre.salaire_min && offre.salaire_max 
                  ? `${offre.salaire_min} - ${offre.salaire_max}Fc` 
                  : 'Non spécifié'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Date de publication</p>
              <p className="font-medium">
                {new Date(offre.date_publication).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          {/* Score de compatibilité (uniquement pour les candidats) */}
          {isCandidat && (
            <div className={`p-4 rounded-xl border-2 ${getCompatibiliteBg(score)} mb-6`}>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getCompatibiliteColor(score)}`}>
                      {calculatingScore ? '...' : `${score}%`}
                    </div>
                    <p className="text-xs text-gray-500">Compatibilité</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {calculatingScore ? 'Calcul du score...' : `${getCompatibiliteLabel(score).icon} Niveau ${getCompatibiliteLabel(score).label}`}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {calculatingScore ? 'Analyse des compétences...' : `${totalMatchees} compétences matchées sur ${totalRequises}`}
                    </p>
                  </div>
                </div>
                {!calculatingScore && (
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-medium">
                      ✅ {totalMatchees} matchées
                    </span>
                    {competencesManquantes.length > 0 && (
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full text-xs font-medium">
                        ❌ {competencesManquantes.length} manquantes
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
              Description du poste
            </h3>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {offre.description || 'Aucune description disponible.'}
            </div>
          </div>

          {/* Compétences avec statut matché/manquant (uniquement pour les candidats) */}
          {offre.competences && offre.competences.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-500" />
                Compétences requises
                {isCandidat && !calculatingScore && (
                  <span className="text-sm font-normal text-gray-500">
                    ({totalMatchees} matchées / {totalRequises} requises)
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                {offre.competences.map((comp: any) => {
                  const isMatched = isCandidat && competencesMatchees.includes(comp.nom)
                  const isMissing = isCandidat && competencesManquantes.includes(comp.nom)
                  
                  return (
                    <span 
                      key={comp.id} 
                      className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 ${
                        isMatched 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                          : isMissing
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      }`}
                    >
                      {isMatched && '✅'}
                      {isMissing && '❌'}
                      {!isCandidat && '•'}
                      {comp.nom}
                    </span>
                  )
                })}
              </div>
              {isCandidat && !calculatingScore && competencesManquantes.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Compétences manquantes : {competencesManquantes.join(', ')}
                  </p>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    💡 Ajoutez ces compétences à votre profil pour augmenter votre score de compatibilité
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl mb-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                {offre.nombre_candidatures || 0}
              </p>
              <p className="text-xs text-gray-500">Candidatures</p>
            </div>
            {isCandidat && (
              <div className="text-center">
                <p className={`text-2xl font-bold ${getCompatibiliteColor(score)}`}>
                  {calculatingScore ? '...' : `${score}%`}
                </p>
                <p className="text-xs text-gray-500">Compatibilité</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {favori ? '⭐' : '☆'}
              </p>
              <p className="text-xs text-gray-500">Favori</p>
            </div>
          </div>

          {/* ⭐ ACTIONS AVEC POSTULER UNIQUEMENT POUR CANDIDATS */}
          <div className="flex flex-wrap gap-3">
            {isCandidat ? (
              <button
                onClick={postuler}
                className="flex-1 glass-button flex items-center justify-center gap-2"
              >
                <Send className="w-5 h-5" />
                Postuler maintenant
              </button>
            ) : (
              <Link
                to="/offres"
                className="flex-1 glass-button flex items-center justify-center gap-2 bg-gray-500/20 hover:bg-gray-500/30"
              >
                <Eye className="w-5 h-5" />
                Retour aux offres
              </Link>
            )}
            <button
              onClick={toggleFavori}
              className={`px-6 py-3 rounded-xl flex items-center gap-2 transition-colors ${
                favori 
                  ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/20' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Heart className={`w-5 h-5 ${favori ? 'fill-current' : ''}`} />
              {favori ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: offre.titre,
                    text: `Découvrez cette offre: ${offre.titre}`,
                    url: window.location.href
                  })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  afficherNotification('Lien copié dans le presse-papier !', 'success')
                }
              }}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl flex items-center gap-2 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              Partager
            </button>
          </div>

          {/* Recommandations pour améliorer le score (uniquement pour les candidats) */}
          {isCandidat && !calculatingScore && competencesManquantes.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Conseils pour améliorer votre compatibilité
              </h4>
              <ul className="mt-2 space-y-1">
                <li className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  Ajoutez ces compétences à votre profil : {competencesManquantes.join(', ')}
                </li>
                <li className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  Mettez à jour votre CV pour mentionner ces compétences
                </li>
                <li className="text-sm text-blue-700 dark:text-blue-300 flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  {score < 50 ? 'Cherchez des formations pour acquérir ces compétences' : 'Vous êtes sur la bonne voie ! Continuez à enrichir votre profil'}
                </li>
              </ul>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  )
}

export default OffreDetail
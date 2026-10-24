// pages/RechercheOffres.tsx
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import GlassCard from '@/components/GlassCard'
import { 
  Search, MapPin, Briefcase, Clock, ArrowRight, 
  Heart, Share2, Sliders, DollarSign, Building2, 
  X, FileText, Upload, Send, Eye, RefreshCcw, 
  AlertCircle, AlertTriangle, Loader2, Award as AwardIcon,
  Sparkles, CheckCircle2, Building, Coins
} from 'lucide-react'
import { offreService, Offre } from '@/services/offreService'
import { candidatService } from '@/services/candidatService'
import { useNotificationStore } from '@/store/useStore'
import { useAuthStore } from '@/store/useStore'

// Composant Skeleton stylisé
const SkeletonLoader = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-emerald-500/10 dark:bg-slate-800/60 rounded-2xl border border-emerald-500/10 ${className}`} />
)

const RechercheOffres = () => {
  const [recherche, setRecherche] = useState('')
  const [offres, setOffres] = useState<Offre[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showFiltresAvances, setShowFiltresAvances] = useState(false)
  const [selectedOffre, setSelectedOffre] = useState<Offre | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [favoris, setFavoris] = useState<number[]>([])
  
  // Filtres simplifiés
  const [filtres, setFiltres] = useState({
    type_contrat: '',
    salaire_min: '',
    salaire_max: ''
  })
  
  // États pour la candidature
  const [showCandidatureModal, setShowCandidatureModal] = useState(false)
  const [offrePourCandidature, setOffrePourCandidature] = useState<Offre | null>(null)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [lmFile, setLmFile] = useState<File | null>(null)
  const [notes, setNotes] = useState('')
  const [soumissionEnCours, setSoumissionEnCours] = useState(false)
  const [cvError, setCvError] = useState<string | null>(null)
  const [lmError, setLmError] = useState<string | null>(null)
  const cvInputRef = useRef<HTMLInputElement>(null)
  const lmInputRef = useRef<HTMLInputElement>(null)
  
  const { afficherNotification } = useNotificationStore()
  const { utilisateur } = useAuthStore()

  const isCandidat = utilisateur?.role === 'candidat'

  useEffect(() => {
    chargerOffres()
    const savedFavoris = localStorage.getItem('offres_favorites')
    if (savedFavoris) {
      setFavoris(JSON.parse(savedFavoris))
    }
  }, [])

  const chargerOffres = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await offreService.getOffres()
      setOffres(data)
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Erreur lors du chargement des offres'
      setError(message)
      afficherNotification(message, 'error')
      setOffres([])
    } finally {
      setLoading(false)
    }
  }

  const handlePostulerAvecFichiers = async () => {
    if (!cvFile) {
      setCvError('Veuillez sélectionner votre CV')
      return
    }
    
    const cvType = cvFile.type
    if (cvType !== 'application/pdf' && !cvType.includes('word') && !cvType.includes('document')) {
      setCvError('Le CV doit être au format PDF ou Word')
      return
    }
    
    setCvError(null)
    setLmError(null)
    setSoumissionEnCours(true)
    
    try {
      await candidatService.uploadCV(cvFile)
      if (lmFile) {
        await candidatService.uploadLettreMotivation(lmFile)
      }
      
      if (offrePourCandidature) {
        await offreService.postuler(offrePourCandidature.id)
        afficherNotification('✅ Candidature envoyée avec succès !', 'success')
        
        setShowCandidatureModal(false)
        setOffrePourCandidature(null)
        setCvFile(null)
        setLmFile(null)
        setNotes('')
      }
    } catch (error: any) {
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

  const toggleFavori = (offreId: number) => {
    let newFavoris: number[]
    if (favoris.includes(offreId)) {
      newFavoris = favoris.filter(id => id !== offreId)
      afficherNotification('Offre retirée des favoris', 'info')
    } else {
      newFavoris = [...favoris, offreId]
      afficherNotification('Offre ajoutée aux favoris', 'success')
    }
    setFavoris(newFavoris)
    localStorage.setItem('offres_favorites', JSON.stringify(newFavoris))
  }

  const ouvrirCandidature = (offre: Offre) => {
    setOffrePourCandidature(offre)
    setCvFile(null)
    setLmFile(null)
    setNotes('')
    setCvError(null)
    setLmError(null)
    setShowCandidatureModal(true)
  }

  // Filtrage basé uniquement sur la recherche textuelle et les filtres de budget/contrat
  const offresFiltrees = offres.filter(offre => {
    const matchRecherche = 
      offre.titre?.toLowerCase().includes(recherche.toLowerCase()) ||
      offre.description?.toLowerCase().includes(recherche.toLowerCase()) ||
      offre.entreprise_nom?.toLowerCase().includes(recherche.toLowerCase())
    
    const contratType = offre.contrat_type || offre.type_contrat || ''
    const matchTypeContrat = !filtres.type_contrat || 
      contratType.toLowerCase() === filtres.type_contrat.toLowerCase()
    
    const matchSalaireMin = !filtres.salaire_min || 
      (offre.salaire_min && offre.salaire_min >= parseInt(filtres.salaire_min))
    
    const matchSalaireMax = !filtres.salaire_max || 
      (offre.salaire_max && offre.salaire_max <= parseInt(filtres.salaire_max))
    
    return matchRecherche && matchTypeContrat && matchSalaireMin && matchSalaireMax
  })

  // Formatage propre du salaire en Francs Congolais (CDF / FC)
  const formatSalaireCDF = (min?: number, max?: number) => {
    if (min && max) {
      return `${min.toLocaleString('fr-FR')} - ${max.toLocaleString('fr-FR')} FC`
    }
    if (min) return `À partir de ${min.toLocaleString('fr-FR')} FC`
    if (max) return `Jusqu'à ${max.toLocaleString('fr-FR')} FC`
    return 'Salaire non spécifié'
  }

  if (loading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonLoader className="h-10 w-64" />
            <SkeletonLoader className="h-4 w-80" />
          </div>
        </div>
        <SkeletonLoader className="h-16 w-full" />
        {[...Array(3)].map((_, i) => (
          <SkeletonLoader key={i} className="h-44 w-full" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 dark:from-emerald-400 dark:to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-emerald-500" />
              Offres d'emploi
            </h1>
            <p className="text-slate-600 dark:text-slate-400">Consultez toutes les opportunités disponibles</p>
          </div>
          <button
            onClick={chargerOffres}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-teal-300 font-semibold text-xs border border-emerald-500/20 transition-all"
          >
            <RefreshCcw className="w-4 h-4" /> Réessayer
          </button>
        </div>
        <div className="p-12 text-center rounded-3xl bg-white/40 dark:bg-slate-900/50 backdrop-blur-2xl border border-red-500/20 shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400 text-lg font-bold">{error}</p>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Vérifiez la connexion avec le serveur backend.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-3 sm:px-6 py-6">
      
      {/* MODAL CANDIDATURE */}
      <AnimatePresence>
        {showCandidatureModal && offrePourCandidature && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-emerald-500/30 shadow-[0_20px_50px_rgba(16,185,129,0.2)] p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/10 dark:border-slate-800">
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 dark:from-emerald-400 dark:to-teal-300 bg-clip-text text-transparent flex items-center gap-2">
                  <Send className="w-5 h-5 text-emerald-500" /> Postuler à l'offre
                </h2>
                <button
                  onClick={() => {
                    setShowCandidatureModal(false)
                    setOffrePourCandidature(null)
                  }}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-emerald-500/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-5 mt-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">{offrePourCandidature.titre}</h3>
                  <p className="text-xs text-emerald-600 dark:text-teal-400 font-medium mt-0.5">
                    {offrePourCandidature.entreprise_nom || 'Entreprise'}
                  </p>
                </div>

                {/* CV Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    CV * <span className="text-emerald-600 dark:text-teal-400 font-normal">(PDF ou Word, max 10Mo)</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                      cvError ? 'border-red-500 bg-red-500/5' : 
                      cvFile ? 'border-emerald-500 bg-emerald-500/10' : 
                      'border-emerald-500/30 hover:border-emerald-500/60 bg-emerald-500/5'
                    }`}
                    onClick={() => cvInputRef.current?.click()}
                  >
                    {cvFile ? (
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <FileText className="w-7 h-7 text-emerald-500" />
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{cvFile.name}</p>
                            <p className="text-[10px] text-slate-500">{(cvFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCvFile(null)
                          }}
                          className="p-1 text-red-500 hover:bg-red-500/10 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Cliquez pour déposer votre CV
                        </p>
                      </div>
                    )}
                    <input
                      ref={cvInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setCvFile(file)
                      }}
                      className="hidden"
                    />
                  </div>
                  {cvError && <p className="text-xs text-red-500 mt-1">{cvError}</p>}
                </div>

                {/* LM Upload */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Lettre de motivation <span className="text-slate-400 font-normal">(Optionnel)</span>
                  </label>
                  <div 
                    className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                      lmFile ? 'border-emerald-500 bg-emerald-500/10' : 'border-emerald-500/20 hover:border-emerald-500/40'
                    }`}
                    onClick={() => lmInputRef.current?.click()}
                  >
                    {lmFile ? (
                      <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                          <FileText className="w-7 h-7 text-teal-500" />
                          <div className="text-left">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{lmFile.name}</p>
                            <p className="text-[10px] text-slate-500">{(lmFile.size / 1024).toFixed(1)} KB</p>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setLmFile(null) }} className="p-1 text-red-500 hover:bg-red-500/10 rounded-full">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <FileText className="w-7 h-7 text-slate-400 mx-auto mb-1 opacity-70" />
                        <p className="text-xs text-slate-600 dark:text-slate-400">Ajouter une lettre de motivation</p>
                      </div>
                    )}
                    <input
                      ref={lmInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setLmFile(file)
                      }}
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Message pour le recruteur</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-emerald-500/20 text-xs focus:outline-none focus:border-emerald-500"
                    placeholder="Présentez brièvement vos motivations..."
                  />
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCandidatureModal(false)}
                    className="flex-1 py-2.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handlePostulerAvecFichiers}
                    disabled={soumissionEnCours || !cvFile}
                    className="flex-1 py-2.5 rounded-full text-xs font-bold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {soumissionEnCours ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Envoyer ma candidature
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* En-tête de la page */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-emerald-500" />
            Offres d'emploi
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-teal-300 border border-emerald-500/20">
              {offres.length} disponibles
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Trouvez les meilleures opportunités adaptées à vos compétences
          </p>
        </div>
        <button
          onClick={chargerOffres}
          className="self-start md:self-auto flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-teal-300 font-semibold text-xs border border-emerald-500/20 transition-all backdrop-blur-md"
        >
          <RefreshCcw className="w-3.5 h-3.5" /> Actualiser
        </button>
      </div>

      {/* Barre de Recherche Épurée - Style Liquid Glass */}
      <div className="p-3 sm:p-4 rounded-3xl bg-white/40 dark:bg-slate-900/50 backdrop-blur-2xl border border-emerald-500/20 dark:border-teal-400/20 shadow-[0_8px_32px_0_rgba(16,185,129,0.08)]">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-600 dark:text-teal-400" />
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par titre de poste, mots-clés ou entreprise..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white/60 dark:bg-slate-800/60 border border-emerald-500/15 dark:border-teal-500/15 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition-all"
            />
          </div>
          <button
            onClick={() => setShowFiltresAvances(!showFiltresAvances)}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all border ${
              showFiltresAvances 
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                : 'bg-emerald-500/10 text-emerald-800 dark:text-teal-300 border-emerald-500/20 hover:bg-emerald-500/20'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Filtres
          </button>
        </div>

        {/* Panneau de filtres optionnel (Salaire en CDF et Contrat) */}
        {showFiltresAvances && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-emerald-500/10 dark:border-slate-800"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Type de contrat</label>
              <select
                value={filtres.type_contrat}
                onChange={(e) => setFiltres({ ...filtres, type_contrat: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800 border border-emerald-500/20 text-xs"
              >
                <option value="">Tous les contrats</option>
                <option value="cdi">CDI</option>
                <option value="cdd">CDD</option>
                <option value="stage">Stage</option>
                <option value="freelance">Freelance</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Salaire min (FC)</label>
              <input
                type="number"
                value={filtres.salaire_min}
                onChange={(e) => setFiltres({ ...filtres, salaire_min: e.target.value })}
                placeholder="Ex: 500000"
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800 border border-emerald-500/20 text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Salaire max (FC)</label>
              <input
                type="number"
                value={filtres.salaire_max}
                onChange={(e) => setFiltres({ ...filtres, salaire_max: e.target.value })}
                placeholder="Ex: 2500000"
                className="w-full px-3 py-2 rounded-xl bg-white/80 dark:bg-slate-800 border border-emerald-500/20 text-xs"
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Liste des Offres */}
      <div className="space-y-4">
        {offresFiltrees.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/40 dark:bg-slate-900/50 backdrop-blur-2xl border border-emerald-500/20 shadow-xl">
            <Briefcase className="w-12 h-12 text-slate-400 mx-auto mb-3 opacity-60" />
            <p className="text-slate-600 dark:text-slate-300 font-semibold text-sm">
              Aucune offre ne correspond à votre recherche
            </p>
            {recherche && (
              <button
                onClick={() => setRecherche('')}
                className="mt-3 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-teal-300 font-bold text-xs"
              >
                Effacer la recherche
              </button>
            )}
          </div>
        ) : (
          offresFiltrees.map((offre, index) => {
            const contratType = offre.contrat_type || offre.type_contrat || 'CDI'
            const estFavori = favoris.includes(offre.id)

            return (
              <motion.div
                key={offre.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <div 
                  onClick={() => {
                    setSelectedOffre(offre)
                    setShowDetailsModal(true)
                  }}
                  className="group relative p-5 rounded-3xl bg-white/40 dark:bg-slate-900/50 backdrop-blur-2xl border border-emerald-500/20 dark:border-teal-400/20 shadow-[0_4px_20px_0_rgba(16,185,129,0.05)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.15)] hover:border-emerald-500/40 transition-all cursor-pointer overflow-hidden"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      {/* Logo Entreprise / Icône */}
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-[1px] flex-shrink-0">
                        <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[15px] flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-emerald-600 dark:text-teal-400" />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-teal-300 transition-colors">
                            {offre.titre}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-700 dark:text-teal-300 border border-emerald-500/20">
                            {contratType}
                          </span>
                        </div>

                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                          {offre.entreprise_nom || 'Entreprise partenaire'}
                        </p>

                        <div className="flex flex-wrap items-center gap-4 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                          {offre.localisation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                              {offre.localisation}
                            </span>
                          )}
                          <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-teal-400">
                            <Coins className="w-3.5 h-3.5" />
                            {formatSalaireCDF(offre.salaire_min, offre.salaire_max)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(offre.date_publication).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions à droite */}
                    <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-emerald-500/10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavori(offre.id)
                        }}
                        className={`p-2.5 rounded-full transition-all ${
                          estFavori 
                            ? 'text-red-500 bg-red-500/10 border border-red-500/20' 
                            : 'text-slate-400 hover:text-red-500 hover:bg-emerald-500/10'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${estFavori ? 'fill-current' : ''}`} />
                      </button>

                      {isCandidat ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            ouvrirCandidature(offre)
                          }}
                          className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 hover:scale-[1.02] transition-all flex items-center gap-1.5"
                        >
                          Postuler <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedOffre(offre)
                            setShowDetailsModal(true)
                          }}
                          className="px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-teal-300 font-bold text-xs hover:bg-emerald-500/20 transition-all flex items-center gap-1.5"
                        >
                          Détails <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Modal Détails Offre */}
      <AnimatePresence>
        {showDetailsModal && selectedOffre && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-emerald-500/30 shadow-[0_20px_50px_rgba(16,185,129,0.2)] p-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-emerald-500/10 dark:border-slate-800">
                <h2 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-500" /> Détails du poste
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-emerald-500/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 mt-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-slate-100">{selectedOffre.titre}</h3>
                  <p className="text-xs font-bold text-emerald-600 dark:text-teal-400 flex items-center gap-1.5 mt-1">
                    <Building className="w-4 h-4" />
                    {selectedOffre.entreprise_nom || 'Entreprise Partenaire'}
                  </p>
                </div>

                {/* Badges d'informations clés */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Rémunération</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-teal-300 mt-0.5">
                      {formatSalaireCDF(selectedOffre.salaire_min, selectedOffre.salaire_max)}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Type de contrat</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {(selectedOffre.contrat_type || selectedOffre.type_contrat || 'CDI').toUpperCase()}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Publication</p>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      {new Date(selectedOffre.date_publication).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Description de la mission</h4>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-emerald-500/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {selectedOffre.description || 'Aucune description fournie.'}
                  </div>
                </div>

                {/* Compétences */}
                {selectedOffre.competences && selectedOffre.competences.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Compétences requises</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedOffre.competences.map((comp: any) => (
                        <span key={comp.id || comp.nom} className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-teal-300 border border-emerald-500/20">
                          {comp.nom}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions au bas du modal */}
                <div className="flex gap-3 pt-4 border-t border-emerald-500/10">
                  {isCandidat && (
                    <button
                      onClick={() => {
                        setShowDetailsModal(false)
                        ouvrirCandidature(selectedOffre)
                      }}
                      className="flex-1 py-3 rounded-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Postuler immédiatement
                    </button>
                  )}
                  <button
                    onClick={() => toggleFavori(selectedOffre.id)}
                    className="px-4 py-3 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-teal-300 font-bold text-xs flex items-center gap-2"
                  >
                    <Heart className={`w-4 h-4 ${favoris.includes(selectedOffre.id) ? 'fill-current text-red-500' : ''}`} />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default RechercheOffres
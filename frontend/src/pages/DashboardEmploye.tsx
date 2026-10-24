import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useStore'
import { useNotificationStore } from '@/store/useStore'
import GlassCard from '@/components/GlassCard'
import { Briefcase, MessageSquare, ShieldCheck, ArrowRight, Building2, Calendar, MapPin, Users, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import { getToken } from '@/services/api'

interface EmployeData {
  id: number
  prenom: string
  nom: string
  email: string
  telephone?: string
  adresse?: string
  date_embauche: string
  titre_poste?: string
  poste?: { titre: string; description?: string }
  departement?: { nom: string }
  entreprise?: { id: number; nom: string; secteur?: string; ville?: string }
}

const DashboardEmploye = () => {
  const { utilisateur, estConnecte } = useAuthStore()
  const navigate = useNavigate()
  const { afficherNotification } = useNotificationStore()
  const [employeData, setEmployeData] = useState<EmployeData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!estConnecte) {
      afficherNotification('Veuillez vous connecter pour accéder à votre espace employé', 'error')
      navigate('/connexion')
      return
    }

    if (!utilisateur || utilisateur.role !== 'candidat') {
      afficherNotification('Accès réservé aux employés', 'error')
      navigate('/')
      return
    }

    if (utilisateur.statut_profil !== 'employe') {
      if (utilisateur.statut_profil === 'ancien_employe') {
        navigate('/dashboard/ancien-employe')
      } else {
        navigate('/dashboard/candidat')
      }
      return
    }

    fetchEmployeData()
  }, [estConnecte, utilisateur, navigate, afficherNotification])

  const fetchEmployeData = async () => {
    try {
      const token = getToken()
      if (!token) return

      // Récupérer les informations de l'employé
      const response = await fetch(`/api/employes/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setEmployeData(data)
      } else {
        // Fallback or handle error
        console.warn("Impossible de charger les données de l'employé")
      }
    } catch (error) {
      console.error('Erreur chargement données employé:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
            Tableau de bord employé
          </h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Bienvenue {employeData?.prenom || utilisateur?.email} dans votre espace collaborateur.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/messagerie" className="glass-button flex items-center gap-2 bg-gradient-to-r from-primary-500 to-purple-500 text-white border-0 hover:from-primary-600 hover:to-purple-600">
            <MessageSquare className="w-4 h-4" />
            Messagerie d'entreprise
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-6 h-full border-t-4 border-t-primary-500">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 dark:bg-primary-900/30 text-primary-600">
                <Briefcase className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Poste actuel</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {employeData?.titre_poste || employeData?.poste?.titre || 'Employé'}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Building2 className="w-5 h-5 text-gray-400" />
                <span>
                  <strong>Entreprise :</strong> {employeData?.entreprise?.nom || utilisateur?.entreprise_actuelle_id || 'Non renseignée'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Users className="w-5 h-5 text-gray-400" />
                <span>
                  <strong>Département :</strong> {employeData?.departement?.nom || 'Général'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                <Calendar className="w-5 h-5 text-gray-400" />
                <span>
                  <strong>Date d'embauche :</strong> {employeData?.date_embauche || utilisateur?.date_embauche ? new Date(employeData?.date_embauche || utilisateur?.date_embauche!).toLocaleDateString('fr-FR') : 'Non renseignée'}
                </span>
              </div>
              {employeData?.entreprise?.ville && (
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span>
                    <strong>Lieu :</strong> {employeData.entreprise.ville}
                  </span>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-6 h-full border-t-4 border-t-purple-500">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-purple-500" />
              Actions rapides
            </h2>
            <div className="flex flex-col gap-3">
              <Link to="/messagerie" className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800 transition group">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400">Contacter mes collègues</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Échangez des messages, fichiers et vocaux</p>
              </Link>
              <Link to="/profil" className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 dark:hover:border-primary-800 transition group">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400">Mettre à jour mon profil</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Modifiez vos informations personnelles</p>
              </Link>
              <button onClick={() => afficherNotification("L'accès à vos fiches de paie sera bientôt disponible", 'info')} className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-200 dark:hover:border-green-800 transition group text-left">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-green-600 dark:group-hover:text-green-400">Mes documents RH</span>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
                </div>
                <p className="text-xs text-gray-500 mt-1">Fiches de paie, contrats et attestations</p>
              </button>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="p-6 h-full border-t-4 border-t-blue-500 flex flex-col">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-blue-500" />
              Actualités entreprise
            </h2>
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
              <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
              <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Aucune annonce</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Votre entreprise n'a publié aucune annonce ou actualité récemment.
              </p>
            </div>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-3">
              <div className="mt-0.5"><div className="w-2 h-2 rounded-full bg-blue-500" /></div>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>Conseil :</strong> Pensez à vérifier vos messages régulièrement pour rester informé des nouveautés de l'entreprise.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  )
}

export default DashboardEmploye
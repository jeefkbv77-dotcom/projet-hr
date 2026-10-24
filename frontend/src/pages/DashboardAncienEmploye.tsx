import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useStore'
import { useNotificationStore } from '@/store/useStore'
import GlassCard from '@/components/GlassCard'
import { Briefcase, MessageSquare, Clock, Archive, ArrowRight } from 'lucide-react'

const DashboardAncienEmploye = () => {
  const { utilisateur, estConnecte } = useAuthStore()
  const navigate = useNavigate()
  const { afficherNotification } = useNotificationStore()

  useEffect(() => {
    if (!estConnecte) {
      afficherNotification('Veuillez vous connecter pour accéder à votre espace ancien employé', 'error')
      navigate('/connexion')
      return
    }

    if (!utilisateur || utilisateur.role !== 'candidat') {
      afficherNotification('Accès réservé aux anciens employés', 'error')
      navigate('/')
      return
    }

    if (utilisateur.statut_profil !== 'ancien_employe') {
      if (utilisateur.statut_profil === 'employe') {
        navigate('/dashboard/employe')
      } else {
        navigate('/dashboard/candidat')
      }
    }
  }, [estConnecte, utilisateur, navigate, afficherNotification])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Tableau de bord ancien employé</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Votre espace d'ancien employé SmartRecruit.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/messagerie" className="glass-button flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Ouvrir la messagerie
          </Link>
          <Link to="/profil" className="glass-button flex items-center gap-2">
            <Archive className="w-4 h-4" />
            Voir mon profil
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-500 text-white">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Statut</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">Ancien employé</p>
            </div>
          </div>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>Statut de profil : {utilisateur?.statut_profil || 'N/A'}</p>
            <p>Date d'embauche : {utilisateur?.date_embauche ? new Date(utilisateur.date_embauche).toLocaleDateString('fr-FR') : 'Non renseignée'}</p>
            <p>Entreprise précédente : {utilisateur?.entreprise_actuelle_id || 'Non renseignée'}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Prochains pas</h2>
          <div className="flex flex-col gap-3">
            <Link to="/messagerie" className="glass-button w-full text-left">
              <span className="font-medium">Continuer à échanger</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">Conservez le contact avec votre réseau</p>
            </Link>
            <Link to="/offres" className="glass-button w-full text-left">
              <span className="font-medium">Explorer de nouvelles offres</span>
              <p className="text-sm text-gray-500 dark:text-gray-400">Consultez les opportunités de reprise</p>
            </Link>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Résumé</h2>
          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <p>En tant qu'ancien employé, vous pouvez conserver un historique et rester en contact.</p>
            <p>Votre profil est toujours actif sur SmartRecruit pour de nouvelles opportunités.</p>
          </div>
          <div className="mt-4 flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <ArrowRight className="w-4 h-4" />
            <span>Vous pouvez également mettre à jour votre profil et postuler à nouveau.</span>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

export default DashboardAncienEmploye

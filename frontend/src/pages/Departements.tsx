// src/pages/Departements.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import Skeleton from '@/components/Skeleton'
import { 
  Building2, Plus, Trash2, Edit, Eye, X, Save,
  Users, Calendar, FileText, RefreshCw, Loader2
} from 'lucide-react'
import { useNotificationStore } from '@/store/useStore'
import { useAuthStore } from '@/store/useStore'
import { departementService, Departement } from '@/services/departementService'
import { useNavigate } from 'react-router-dom'
import { getToken } from '@/services/api'

// Composant Skeleton fallback
const SkeletonLoader = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
)

const Departements = () => {
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

  const [departements, setDepartements] = useState<Departement[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [selectedDepartement, setSelectedDepartement] = useState<Departement | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const [formData, setFormData] = useState({
    nom: '',
    description: ''
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
    if (!verifyToken()) return
    
    setLoading(true)
    try {
      const data = await departementService.getDepartements()
      setDepartements(data)
    } catch (error: any) {
      console.error('❌ Erreur chargement départements:', error)
      
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      
      afficherNotification('Erreur lors du chargement des départements', 'error')
      setDepartements([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (estConnecte) {
      fetchData()
    }
  }, [estConnecte])

  const resetForm = () => {
    setFormData({ nom: '', description: '' })
    setEditingId(null)
  }

  const openCreateModal = () => {
    if (!verifyToken()) return
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (departement: Departement) => {
    if (!verifyToken()) return
    setEditingId(departement.id)
    setFormData({
      nom: departement.nom,
      description: departement.description || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!verifyToken()) {
      setModalLoading(false)
      return
    }
    
    setModalLoading(true)

    try {
      if (editingId) {
        await departementService.updateDepartement(editingId, formData)
        afficherNotification('✅ Département mis à jour avec succès !', 'success')
      } else {
        await departementService.createDepartement(formData)
        afficherNotification('✅ Département créé avec succès !', 'success')
      }
      setShowModal(false)
      resetForm()
      await fetchData()
    } catch (error: any) {
      console.error('❌ Erreur création/mise à jour:', error)
      
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      
      // ⭐ GÉRER LES ERREURS DE VALIDATION DU BACKEND
      let message = 'Erreur lors de l\'opération'
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        if (typeof detail === 'string') {
          message = detail
        } else if (Array.isArray(detail)) {
          message = detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ')
        } else if (typeof detail === 'object') {
          message = detail.msg || detail.message || JSON.stringify(detail)
        }
      } else if (error.message) {
        message = error.message
      }
      
      afficherNotification(message, 'error')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!verifyToken()) return
    
    if (!confirm('Supprimer ce département ?')) return
    
    try {
      await departementService.deleteDepartement(id)
      afficherNotification('✅ Département supprimé avec succès', 'success')
      await fetchData()
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error)
      
      if (error.response?.status === 401) {
        afficherNotification('Session expirée, veuillez vous reconnecter', 'error')
        navigate('/connexion')
        return
      }
      
      const message = error.response?.data?.detail || 'Erreur lors de la suppression'
      afficherNotification(message, 'error')
    }
  }

  const handleViewDepartement = (departement: Departement) => {
    setSelectedDepartement(departement)
    setShowDetailsModal(true)
  }

  // ⭐ SI L'UTILISATEUR N'EST PAS CONNECTÉ
  if (!estConnecte) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-12 text-center max-w-md">
          <Building2 className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
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
        <SkeletonLoader className="h-12 w-64" />
        <SkeletonLoader className="h-20" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <SkeletonLoader key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* MODAL DÉTAILS DÉPARTEMENT */}
      {showDetailsModal && selectedDepartement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <Building2 className="w-6 h-6" />
                  Détails du département
                </h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedDepartement(null)
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                    {selectedDepartement.nom}
                  </h3>
                  {selectedDepartement.description && (
                    <p className="text-gray-600 dark:text-gray-300 mt-2">
                      {selectedDepartement.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div>
                    <p className="text-sm text-gray-500">ID</p>
                    <p className="font-medium">#{selectedDepartement.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date de création</p>
                    <p className="font-medium">
                      {new Date(selectedDepartement.date_creation).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  {selectedDepartement.nombre_employes !== undefined && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-500">Nombre d'employés</p>
                      <p className="font-medium flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary-500" />
                        {selectedDepartement.nombre_employes} employés
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      openEditModal(selectedDepartement)
                    }}
                    className="flex-1 glass-button flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedDepartement(null)
                    }}
                    className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* MODAL AJOUTER/MODIFIER DÉPARTEMENT */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  {editingId ? 'Modifier' : 'Ajouter'} un département
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Ex: Développement, Marketing, RH..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="glass-input w-full min-h-[80px]"
                    placeholder="Description du département..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false)
                      resetForm()
                    }}
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
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {editingId ? 'Modification...' : 'Création...'}
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {editingId ? 'Modifier' : 'Ajouter'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </GlassCard>
          </motion.div>
        </div>
      )}

      {/* En-tête */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
            <Building2 className="w-8 h-8 text-primary-500" />
            Gestion des départements
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gérez les départements de votre entreprise
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="glass-button text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Rafraîchir
          </button>
          <button
            onClick={openCreateModal}
            className="glass-button flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Ajouter un département
          </button>
        </div>
      </motion.div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
            {departements.length}
          </p>
          <p className="text-sm text-gray-500">Total départements</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {departements.filter(d => d.nombre_employes && d.nombre_employes > 0).length}
          </p>
          <p className="text-sm text-gray-500">Départements actifs</p>
        </GlassCard>
        <GlassCard className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {departements.reduce((acc, d) => acc + (d.nombre_employes || 0), 0)}
          </p>
          <p className="text-sm text-gray-500">Total employés</p>
        </GlassCard>
      </div>

      {/* Liste des départements */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departements.length === 0 ? (
          <GlassCard className="p-12 text-center col-span-full">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              Aucun département trouvé
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Créez votre premier département pour organiser votre entreprise
            </p>
            <button
              onClick={openCreateModal}
              className="mt-4 glass-button"
            >
              <Plus className="w-5 h-5 inline-block mr-2" />
              Ajouter un département
            </button>
          </GlassCard>
        ) : (
          departements.map((departement, index) => (
            <motion.div
              key={departement.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-6 hover:shadow-xl transition-all">
                <div className="flex items-start justify-between">
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleViewDepartement(departement)}
                  >
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                      {departement.nom}
                    </h3>
                    {departement.description && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {departement.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500 dark:text-gray-400">
                      {departement.nombre_employes !== undefined && (
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {departement.nombre_employes} employés
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(departement.date_creation).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleViewDepartement(departement)}
                      className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Voir les détails"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(departement)}
                      className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(departement.id)}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

export default Departements
// src/pages/Employes.tsx
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import Skeleton from '@/components/Skeleton'
import { 
  Users, UserPlus, User, Briefcase, Building2, 
  Calendar, Mail, Phone, Trash2, Eye, Edit, X,
  Search, Filter, ArrowRight, CheckCircle, UserCheck,
  RefreshCw, Loader2, Save
} from 'lucide-react'
import { useNotificationStore } from '@/store/useStore'
import { useAuthStore } from '@/store/useStore'
import { employeService, Employe } from '@/services/employeService'
import { departementService, Departement } from '@/services/departementService'
import { offreService } from '@/services/offreService'
import { useNavigate } from 'react-router-dom'
import { getToken } from '@/services/api'

// Composant Skeleton fallback
const SkeletonLoader = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} />
)

const Employes = () => {
  const { utilisateur } = useAuthStore()
  const navigate = useNavigate()
  const { afficherNotification } = useNotificationStore()
  
  // ⭐ PROTECTION DE RÔLE - UNIQUEMENT ENTREPRISES
  useEffect(() => {
    if (utilisateur && utilisateur.role !== 'entreprise' && utilisateur.role !== 'admin') {
      afficherNotification('Accès réservé aux entreprises', 'error')
      navigate('/dashboard/candidat')
    }
  }, [utilisateur, navigate])

  const [employes, setEmployes] = useState<Employe[]>([])
  const [departements, setDepartements] = useState<Departement[]>([])
  const [postes, setPostes] = useState<{ id: number; titre: string }[]>([])
  const [contrats, setContrats] = useState<{ id: number; type_contrat: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    departement_id: 0,
    poste_id: 0,
    contrat_id: 0,
    date_embauche: '',
    titre_poste: '',
    biographie: ''
  })

  // ⭐⭐⭐ CORRECTION PRINCIPALE : Promise.allSettled + gestion d'erreur honnête ⭐⭐⭐
  const fetchData = async () => {
    setLoading(true)

    // ⭐ Log de diagnostic — voir si le token est là au moment du fetch
    const token = getToken()
    console.log('🔍 [fetchData] Token présent:', token ? token.slice(0, 30) + '...' : '❌ NULL')

    if (!token) {
      console.error('❌ Pas de token dans fetchData — impossible de charger')
      setEmployes([])
      setLoading(false)
      afficherNotification('Session non initialisée, veuillez vous reconnecter', 'error')
      return
    }

    try {
      const [employesRes, departementsRes, postesRes, contratsRes] = await Promise.allSettled([
        employeService.getEmployes(),
        departementService.getDepartements(),
        offreService.getPostes(),
        offreService.getContrats()
      ])

      // ⭐ Employés : INDISPENSABLE
      if (employesRes.status === 'fulfilled') {
        setEmployes(employesRes.value)
        console.log('✅ Employés chargés:', employesRes.value.length)
      } else {
        const status = employesRes.reason?.response?.status
        console.error('❌ Employés:', status, employesRes.reason?.message)
        setEmployes([])

        // ⭐ Message HONNÊTE selon le statut
        if (status === 401) {
          console.warn('⚠️ 401 sur /employes/ — token présent mais rejeté par le backend')
          afficherNotification(
            'Le serveur refuse la requête (401). Vérifiez la console pour plus de détails.',
            'error'
          )
        } else if (status === 403) {
          afficherNotification('Accès refusé (403). Votre compte n\'a pas les permissions.', 'error')
        } else if (status >= 500) {
          afficherNotification('Erreur serveur. Réessayez plus tard.', 'error')
        } else {
          afficherNotification(
            `Erreur lors du chargement des employés${status ? ` (${status})` : ''}`,
            'error'
          )
        }
      }

      // ⭐ Départements : OPTIONNEL
      if (departementsRes.status === 'fulfilled') {
        setDepartements(departementsRes.value)
        console.log('✅ Départements chargés:', departementsRes.value.length)
      } else {
        console.warn('⚠️ Départements non chargés (non bloquant):', departementsRes.reason?.response?.status)
        setDepartements([])
      }

      // ⭐ Postes : OPTIONNEL
      if (postesRes.status === 'fulfilled') {
        setPostes(postesRes.value)
        console.log('✅ Postes chargés:', postesRes.value.length)
      } else {
        console.warn('⚠️ Postes non chargés (non bloquant):', postesRes.reason?.response?.status)
        setPostes([])
      }

      // ⭐ Contrats : OPTIONNEL
      if (contratsRes.status === 'fulfilled') {
        setContrats(contratsRes.value)
        console.log('✅ Contrats chargés:', contratsRes.value.length)
      } else {
        console.warn('⚠️ Contrats non chargés (non bloquant):', contratsRes.reason?.response?.status)
        setContrats([])
      }
    } catch (error: any) {
      console.error('❌ Erreur globale fetchData:', error)
      afficherNotification('Erreur lors du chargement', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resetForm = () => {
    setFormData({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      adresse: '',
      departement_id: 0,
      poste_id: 0,
      contrat_id: 0,
      date_embauche: '',
      titre_poste: '',
      biographie: ''
    })
    setEditingId(null)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (employe: Employe) => {
    setEditingId(employe.id)
    setFormData({
      nom: employe.nom || '',
      prenom: employe.prenom || '',
      email: employe.email || '',
      telephone: employe.telephone || '',
      adresse: employe.adresse || '',
      departement_id: employe.departement_id || 0,
      poste_id: employe.poste_id || 0,
      contrat_id: employe.contrat_id || 0,
      date_embauche: employe.date_embauche || '',
      titre_poste: employe.titre_poste || '',
      biographie: employe.biographie || ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalLoading(true)

    try {
      if (editingId) {
        await employeService.updateEmploye(editingId, formData)
        afficherNotification('✅ Employé modifié avec succès !', 'success')
      } else {
        await employeService.createEmploye(formData)
        afficherNotification('✅ Employé ajouté avec succès !', 'success')
      }
      setShowModal(false)
      resetForm()
      await fetchData()
    } catch (error: any) {
      const status = error.response?.status
      let message = error.response?.data?.detail || 'Erreur lors de l\'opération'
      if (status === 401) {
        message = 'Le serveur refuse la requête (401). Vérifiez la console.'
      }
      afficherNotification(message, 'error')
    } finally {
      setModalLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cet employé ?')) return
    try {
      await employeService.deleteEmploye(id)
      afficherNotification('✅ Employé supprimé avec succès', 'success')
      await fetchData()
    } catch (error) {
      afficherNotification('Erreur lors de la suppression', 'error')
    }
  }

  const handleViewEmploye = (employe: Employe) => {
    setSelectedEmploye(employe)
    setShowDetailsModal(true)
  }

  const employesFiltres = employes.filter(e =>
    e.nom?.toLowerCase().includes(search.toLowerCase()) ||
    e.prenom?.toLowerCase().includes(search.toLowerCase()) ||
    e.email?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-8">
        <SkeletonLoader className="h-12 w-64" />
        <SkeletonLoader className="h-20" />
        {[...Array(3)].map((_, i) => (
          <SkeletonLoader key={i} className="h-32" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* MODAL DÉTAILS EMPLOYÉ */}
      {showDetailsModal && selectedEmploye && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
                  <User className="w-6 h-6" />
                  Détails de l'employé
                </h2>
                <button
                  onClick={() => {
                    setShowDetailsModal(false)
                    setSelectedEmploye(null)
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
                    {selectedEmploye.prenom?.[0]}{selectedEmploye.nom?.[0]}
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                      {selectedEmploye.prenom} {selectedEmploye.nom}
                    </h3>
                    {selectedEmploye.email && (
                      <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        {selectedEmploye.email}
                      </p>
                    )}
                    {selectedEmploye.telephone && (
                      <p className="text-gray-600 dark:text-gray-300 flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        {selectedEmploye.telephone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {selectedEmploye.poste_titre && (
                    <div>
                      <p className="text-sm text-gray-500">Poste</p>
                      <p className="font-medium">{selectedEmploye.poste_titre}</p>
                    </div>
                  )}
                  {selectedEmploye.departement_nom && (
                    <div>
                      <p className="text-sm text-gray-500">Département</p>
                      <p className="font-medium">{selectedEmploye.departement_nom}</p>
                    </div>
                  )}
                  {selectedEmploye.contrat_type && (
                    <div>
                      <p className="text-sm text-gray-500">Contrat</p>
                      <p className="font-medium">{selectedEmploye.contrat_type}</p>
                    </div>
                  )}
                  {selectedEmploye.date_embauche && (
                    <div>
                      <p className="text-sm text-gray-500">Date d'embauche</p>
                      <p className="font-medium">{new Date(selectedEmploye.date_embauche).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                </div>

                {selectedEmploye.adresse && (
                  <div>
                    <p className="text-sm text-gray-500">Adresse</p>
                    <p className="font-medium">{selectedEmploye.adresse}</p>
                  </div>
                )}

                {selectedEmploye.biographie && (
                  <div>
                    <p className="text-sm text-gray-500">Biographie</p>
                    <p className="text-gray-700 dark:text-gray-300">{selectedEmploye.biographie}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      openEditModal(selectedEmploye)
                    }}
                    className="flex-1 glass-button flex items-center justify-center gap-2"
                  >
                    <Edit className="w-5 h-5" />
                    Modifier
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      setSelectedEmploye(null)
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

      {/* MODAL AJOUTER/MODIFIER EMPLOYÉ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  {editingId ? 'Modifier' : 'Ajouter'} un employé
                </h2>
                <button
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Nom *</label>
                    <input
                      type="text"
                      value={formData.nom}
                      onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                      className="glass-input w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Prénom *</label>
                    <input
                      type="text"
                      value={formData.prenom}
                      onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                      className="glass-input w-full"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="glass-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    className="glass-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Adresse</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                    className="glass-input w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Département</label>
                    <select
                      value={formData.departement_id}
                      onChange={(e) => setFormData({ ...formData, departement_id: Number(e.target.value) })}
                      className="glass-input w-full"
                    >
                      <option value={0}>Sélectionner</option>
                      {departements.map(d => (
                        <option key={d.id} value={d.id}>{d.nom}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Poste</label>
                    <select
                      value={formData.poste_id}
                      onChange={(e) => setFormData({ ...formData, poste_id: Number(e.target.value) })}
                      className="glass-input w-full"
                    >
                      <option value={0}>Sélectionner</option>
                      {postes.map(p => (
                        <option key={p.id} value={p.id}>{p.titre}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Contrat</label>
                    <select
                      value={formData.contrat_id}
                      onChange={(e) => setFormData({ ...formData, contrat_id: Number(e.target.value) })}
                      className="glass-input w-full"
                    >
                      <option value={0}>Sélectionner</option>
                      {contrats.map(c => (
                        <option key={c.id} value={c.id}>{c.type_contrat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Date d'embauche</label>
                    <input
                      type="date"
                      value={formData.date_embauche}
                      onChange={(e) => setFormData({ ...formData, date_embauche: e.target.value })}
                      className="glass-input w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Titre du poste</label>
                  <input
                    type="text"
                    value={formData.titre_poste}
                    onChange={(e) => setFormData({ ...formData, titre_poste: e.target.value })}
                    className="glass-input w-full"
                    placeholder="Lead Developer"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Biographie</label>
                  <textarea
                    value={formData.biographie}
                    onChange={(e) => setFormData({ ...formData, biographie: e.target.value })}
                    className="glass-input w-full min-h-[80px]"
                    placeholder="Présentation de l'employé..."
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
                        {editingId ? 'Modification...' : 'Ajout...'}
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
          </div>
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
            <Users className="w-8 h-8 text-primary-500" />
            Gestion des employés
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Gérez les employés de votre entreprise
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
            <UserPlus className="w-5 h-5" />
            Ajouter un employé
          </button>
        </div>
      </motion.div>

      {/* Barre de recherche */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un employé..."
                className="glass-input w-full pl-10"
              />
            </div>
            <button className="glass-button flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtres
            </button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Liste des employés */}
      <div className="space-y-4">
        {employesFiltres.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              {search ? 'Aucun employé ne correspond à votre recherche' : 'Aucun employé trouvé'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="mt-4 glass-button text-sm"
              >
                Réinitialiser la recherche
              </button>
            )}
          </GlassCard>
        ) : (
          employesFiltres.map((employe, index) => (
            <motion.div
              key={employe.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-4 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {employe.prenom?.[0]}{employe.nom?.[0]}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        {employe.prenom} {employe.nom}
                      </h3>
                      <div className="flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
                        {employe.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{employe.email}</span>
                          </span>
                        )}
                        {employe.telephone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {employe.telephone}
                          </span>
                        )}
                        {employe.poste_titre && (
                          <span className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {employe.poste_titre}
                          </span>
                        )}
                        {employe.departement_nom && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {employe.departement_nom}
                          </span>
                        )}
                        {employe.date_embauche && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(employe.date_embauche).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => handleViewEmploye(employe)}
                      className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Voir les détails"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openEditModal(employe)}
                      className="p-2 text-green-500 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(employe.id)}
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

export default Employes
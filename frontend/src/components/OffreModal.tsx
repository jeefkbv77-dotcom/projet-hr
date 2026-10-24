import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save } from 'lucide-react'
import GlassCard from './GlassCard'
import { offreService } from '@/services/offreService'
import { useNotificationStore } from '@/store/useStore'

interface OffreModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function OffreModal({ isOpen, onClose, onSuccess }: OffreModalProps) {
  const { afficherNotification } = useNotificationStore()
  const [loading, setLoading] = useState(false)
  const [postes, setPostes] = useState<{ id: number; titre: string }[]>([])
  const [contrats, setContrats] = useState<{ id: number; type_contrat: string }[]>([])
  const [competences, setCompetences] = useState<{ id: number; nom: string; categorie: string }[]>([])
  
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

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [postesData, contratsData, competencesData] = await Promise.all([
        offreService.getPostes(),
        offreService.getContrats(),
        offreService.getCompetences()
      ])
      setPostes(postesData)
      setContrats(contratsData)
      setCompetences(competencesData)
    } catch (error) {
      console.error('Erreur chargement données:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // ⭐ FORMATER LA DATE CORRECTEMENT
      let dateExpiration = undefined
      if (formData.date_expiration) {
        // Convertir YYYY-MM-DD en objet Date puis en ISO
        const date = new Date(formData.date_expiration + 'T00:00:00')
        // Formater en YYYY-MM-DDTHH:MM:SS (format attendu par le backend)
        dateExpiration = date.toISOString().replace('Z', '')
      }

      const offreData = {
        titre: formData.titre,
        description: formData.description,
        poste_id: Number(formData.poste_id),
        contrat_id: Number(formData.contrat_id),
        localisation: formData.localisation || undefined,
        salaire_min: formData.salaire_min ? parseFloat(formData.salaire_min) : undefined,
        salaire_max: formData.salaire_max ? parseFloat(formData.salaire_max) : undefined,
        date_expiration: dateExpiration,
        competence_ids: formData.competence_ids
      }

      console.log('📤 Envoi des données:', JSON.stringify(offreData, null, 2))

      await offreService.createOffre(offreData)
      afficherNotification('Offre publiée avec succès !', 'success')
      onSuccess()
      onClose()
      resetForm()
    } catch (error: any) {
      console.error('❌ Erreur création offre:', error)
      console.error('❌ Détails:', error.response?.data)
      
      let message = 'Erreur lors de la publication'
      
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail
        
        if (Array.isArray(detail)) {
          message = detail.map((d: any) => {
            if (d.msg) return d.msg
            if (d.message) return d.message
            return JSON.stringify(d)
          }).join(', ')
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
      setLoading(false)
    }
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

  const toggleCompetence = (id: number) => {
    setFormData(prev => ({
      ...prev,
      competence_ids: prev.competence_ids.includes(id)
        ? prev.competence_ids.filter(cid => cid !== id)
        : [...prev.competence_ids, id]
    }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  Publier une offre
                </h2>
                <button
                  onClick={onClose}
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
                    placeholder="Ex: Développeur Full Stack"
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
                        <option key={c.id} value={c.id}>{c.type_contrat.toUpperCase()}</option>
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
                      placeholder="Kinshasa, Lubumbashi, Kananga..."
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
                  <div className="flex flex-wrap gap-2">
                    {competences.map(comp => (
                      <button
                        key={comp.id}
                        type="button"
                        onClick={() => toggleCompetence(comp.id)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                          formData.competence_ids.includes(comp.id)
                            ? 'bg-primary-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
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
                    onClick={onClose}
                    className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 glass-button flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
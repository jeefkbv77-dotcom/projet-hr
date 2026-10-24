import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import { useNotificationStore } from '@/store/useStore'
import { authService } from '@/services/authService'
import { Building2, Mail, Lock, MapPin, Globe, Building } from 'lucide-react'

const InscriptionEntreprise = () => {
  const navigate = useNavigate()
  const { afficherNotification } = useNotificationStore()
  const [etape, setEtape] = useState(1)
  const [chargement, setChargement] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    mot_de_passe: '',
    confirmation_mot_de_passe: '',
    nom: '',
    description: '',
    adresse: '',
    site_web: '',
    secteur_activite: '',
    taille_entreprise: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChargement(true)

    try {
      await authService.registerEntreprise({
        utilisateur: {
          email: formData.email,
          mot_de_passe: formData.mot_de_passe
        },
        entreprise: {
          nom: formData.nom,
          description: formData.description || undefined,
          adresse: formData.adresse || undefined,
          site_web: formData.site_web || undefined,
          secteur_activite: formData.secteur_activite || undefined,
          taille_entreprise: formData.taille_entreprise || undefined
        }
      })

      afficherNotification('Compte entreprise créé avec succès !', 'success')
      navigate('/connexion')
    } catch (erreur: any) {
      console.error('Erreur inscription entreprise:', erreur)
      
      let message = 'Erreur lors de la création du compte'
      
      if (erreur.response?.data?.detail) {
        if (Array.isArray(erreur.response.data.detail)) {
          message = erreur.response.data.detail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(', ')
        } else if (typeof erreur.response.data.detail === 'object') {
          message = JSON.stringify(erreur.response.data.detail)
        } else {
          message = String(erreur.response.data.detail)
        }
      } else if (erreur.message) {
        message = erreur.message
      }
      
      afficherNotification(message, 'error')
    } finally {
      setChargement(false)
    }
  }

  const etapeSuivante = () => {
    if (etape === 1) {
      if (!formData.email) {
        afficherNotification('Veuillez entrer votre email', 'error')
        return
      }
      if (!formData.mot_de_passe || formData.mot_de_passe.length < 8) {
        afficherNotification('Le mot de passe doit contenir au moins 8 caractères', 'error')
        return
      }
      if (formData.mot_de_passe !== formData.confirmation_mot_de_passe) {
        afficherNotification('Les mots de passe ne correspondent pas', 'error')
        return
      }
    }
    setEtape(etape + 1)
  }

  const etapePrecedente = () => {
    setEtape(etape - 1)
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <GlassCard className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
              Inscription Entreprise
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Créez votre compte pour recruter les meilleurs talents
            </p>
          </div>

          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${etape >= 1 ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                1
              </div>
              <div className={`w-16 h-1 ${etape >= 2 ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${etape >= 2 ? 'bg-primary-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                2
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {etape === 1 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email professionnel *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="contact@entreprise.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      name="mot_de_passe"
                      value={formData.mot_de_passe}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="•••••••• (8 caractères min)"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Confirmation du mot de passe *
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      name="confirmation_mot_de_passe"
                      value={formData.confirmation_mot_de_passe}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {etape === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nom de l'entreprise *
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="nom"
                      value={formData.nom}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="Votre entreprise"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="glass-input w-full"
                    rows={3}
                    placeholder="Décrivez votre entreprise..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Adresse
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="adresse"
                      value={formData.adresse}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="Adresse de votre siège"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Site web
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      name="site_web"
                      value={formData.site_web}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="https://www.entreprise.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Secteur d'activité
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      name="secteur_activite"
                      value={formData.secteur_activite}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="Technologie, Finance, Santé..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Taille de l'entreprise
                  </label>
                  <select
                    name="taille_entreprise"
                    value={formData.taille_entreprise}
                    onChange={handleChange}
                    className="glass-input w-full"
                  >
                    <option value="">Sélectionnez la taille</option>
                    <option value="startup">Startup (1-10 employés)</option>
                    <option value="pme">PME (11-100 employés)</option>
                    <option value="grande_entreprise">Grande entreprise (100+ employés)</option>
                  </select>
                </div>
              </motion.div>
            )}

            <div className="flex gap-4">
              {etape > 1 && (
                <button
                  type="button"
                  onClick={etapePrecedente}
                  className="flex-1 py-3 px-6 rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Précédent
                </button>
              )}

              {etape < 2 ? (
                <button
                  type="button"
                  onClick={etapeSuivante}
                  className="flex-1 glass-button"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={chargement}
                  className="flex-1 glass-button disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {chargement ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-2" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Building2 className="w-5 h-5 inline-block mr-2" />
                      Créer mon compte
                    </>
                  )}
                </button>
              )}
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-300">
              Déjà inscrit ?
            </p>
            <Link
              to="/connexion"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 font-medium"
            >
              Se connecter
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}

export default InscriptionEntreprise
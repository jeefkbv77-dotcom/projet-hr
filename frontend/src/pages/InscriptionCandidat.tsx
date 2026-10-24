import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import { useNotificationStore } from '@/store/useStore'
import { authService } from '@/services/authService'
import { UserPlus, Mail, Lock, User, Phone, MapPin, GraduationCap, Briefcase } from 'lucide-react'

const InscriptionCandidat = () => {
  const navigate = useNavigate()
  const { afficherNotification } = useNotificationStore()
  const [etape, setEtape] = useState(1)
  const [chargement, setChargement] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    mot_de_passe: '',
    confirmation_mot_de_passe: '',
    nom: '',
    prenom: '',
    telephone: '',
    adresse: '',
    niveau_etude: '',
    annees_experience: 0,
    disponibilite: 'immediate'
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setChargement(true)

    try {
      await authService.registerCandidat({
        utilisateur: {
          email: formData.email,
          mot_de_passe: formData.mot_de_passe
        },
        candidat: {
          nom: formData.nom,
          prenom: formData.prenom,
          telephone: formData.telephone || undefined,
          adresse: formData.adresse || undefined,
          niveau_etude: formData.niveau_etude || undefined,
          annees_experience: Number(formData.annees_experience) || 0,
          disponibilite: formData.disponibilite || 'immediate'
        }
      })

      afficherNotification('Compte créé avec succès ! Vous pouvez maintenant vous connecter.', 'success')
      navigate('/connexion')
    } catch (erreur: any) {
      console.error('Erreur inscription candidat:', erreur)
      
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
              Inscription Candidat
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Créez votre compte pour trouver votre prochain emploi
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
                    Email *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="votre@email.com"
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="nom"
                        value={formData.nom}
                        onChange={handleChange}
                        className="glass-input w-full pl-10"
                        placeholder="Votre nom"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Prénom *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        name="prenom"
                        value={formData.prenom}
                        onChange={handleChange}
                        className="glass-input w-full pl-10"
                        placeholder="Votre prénom"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Téléphone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="tel"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
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
                      placeholder="Votre adresse"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Niveau d'étude
                  </label>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      name="niveau_etude"
                      value={formData.niveau_etude}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                    >
                      <option value="">Sélectionnez votre niveau</option>
                      <option value="sans_diplome">Sans diplôme</option>
                      <option value="bac">Bac</option>
                      <option value="bac+2">Bac+2</option>
                      <option value="licence">Licence</option>
                      <option value="master">Master</option>
                      <option value="doctorat">Doctorat</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Années d'expérience
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="number"
                      name="annees_experience"
                      value={formData.annees_experience}
                      onChange={handleChange}
                      className="glass-input w-full pl-10"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Disponibilité
                  </label>
                  <select
                    name="disponibilite"
                    value={formData.disponibilite}
                    onChange={handleChange}
                    className="glass-input w-full"
                  >
                    <option value="immediate">Immédiate</option>
                    <option value="une_semaine">Dans une semaine</option>
                    <option value="un_mois">Dans un mois</option>
                    <option value="trois_mois">Dans trois mois</option>
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
                      <UserPlus className="w-5 h-5 inline-block mr-2" />
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

export default InscriptionCandidat
import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import GlassCard from '@/components/GlassCard'
import { useAuthStore } from '@/store/useStore'
import { useNotificationStore } from '@/store/useStore'
import { authService } from '@/services/authService'
import { 
  LogIn, Mail, Lock, User, Briefcase, Eye, EyeOff, Sparkles, 
  Shield, AlertCircle, Building
} from 'lucide-react'

// Son d'erreur (généré en base64)
const ERROR_SOUND = "data:audio/wav;base64,UklGRlQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoAAACBhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqFhYqF"

const Connexion = () => {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { afficherNotification } = useNotificationStore()
  
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [chargement, setChargement] = useState(false)
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false)
  
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [shake, setShake] = useState(false)
  
  const [isCapsLock, setIsCapsLock] = useState(false)
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  const emailInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Initialiser le son
  useEffect(() => {
    audioRef.current = new Audio(ERROR_SOUND)
    audioRef.current.volume = 0.3
  }, [])

  // Jouer le son d'erreur
  const playErrorSound = () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0
        audioRef.current.play().catch(() => {})
      }
    } catch {
      // Ignorer les erreurs de lecture audio
    }
  }

  useEffect(() => {
    emailInputRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setIsCapsLock(e.getModifierState('CapsLock'))
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (isLocked && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    } else if (isLocked && countdown === 0) {
      setIsLocked(false)
      setLoginAttempts(0)
      afficherNotification('Compte déverrouillé, vous pouvez réessayer', 'info')
    }
  }, [isLocked, countdown])

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) return 'L\'email est requis'
    if (!regex.test(email)) return 'Format d\'email invalide'
    return ''
  }

  const validatePassword = (password: string) => {
    if (!password) return 'Le mot de passe est requis'
    if (password.length < 6) return 'Minimum 6 caractères'
    return ''
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    if (emailTouched) {
      setEmailError(validateEmail(value))
    }
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setMotDePasse(value)
    if (passwordTouched) {
      setPasswordError(validatePassword(value))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isLocked) {
      afficherNotification(`Compte verrouillé pour ${countdown} secondes`, 'error')
      return
    }

    const emailValidation = validateEmail(email)
    const passwordValidation = validatePassword(motDePasse)
    
    setEmailTouched(true)
    setPasswordTouched(true)
    setEmailError(emailValidation)
    setPasswordError(passwordValidation)

    if (emailValidation || passwordValidation) {
      setShake(true)
      playErrorSound()
      setTimeout(() => setShake(false), 500)
      return
    }

    setChargement(true)

    try {
      const response = await authService.login({ email, mot_de_passe: motDePasse })
      const utilisateur = await authService.getMe(response.access_token)
      
      setAuth(utilisateur, response.access_token)
      afficherNotification('Connexion réussie ! ✨', 'success')
      setLoginAttempts(0)
      
      setTimeout(() => {
        if (utilisateur.role === 'entreprise') {
          navigate('/dashboard/entreprise')
        } else if (utilisateur.role === 'admin') {
          navigate('/dashboard/admin')
        } else if (utilisateur.statut_profil === 'employe') {
          navigate('/dashboard/employe')
        } else if (utilisateur.statut_profil === 'ancien_employe') {
          navigate('/dashboard/ancien-employe')
        } else {
          navigate('/dashboard/candidat')
        }
      }, 300)
    } catch (erreur) {
      const newAttempts = loginAttempts + 1
      setLoginAttempts(newAttempts)
      
      playErrorSound()
      
      if (newAttempts >= 5) {
        setIsLocked(true)
        setCountdown(30)
        afficherNotification('Trop de tentatives échouées. Compte verrouillé 30s', 'error')
      } else {
        setShake(true)
        setTimeout(() => setShake(false), 500)
        
        const message = typeof erreur === 'object' && erreur !== null && 'response' in erreur
          ? ((erreur as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Erreur lors de la connexion')
          : 'Erreur lors de la connexion'
        afficherNotification(message, 'error')
      }
    } finally {
      setChargement(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 relative overflow-hidden">
      {/* Fond animé */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-300/10 rounded-full blur-3xl animate-pulse delay-2000" />
        
        {/* Particules flottantes avec animation blink */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-primary-400 rounded-full animate-blink" />
        <div className="absolute bottom-1/4 right-1/4 w-3 h-3 bg-purple-400 rounded-full animate-blink delay-300" />
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-blue-400 rounded-full animate-blink delay-700" />
        <div className="absolute top-2/3 left-1/3 w-2.5 h-2.5 bg-pink-400 rounded-full animate-blink delay-500" />
        <div className="absolute bottom-1/3 left-1/4 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-blink delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring', bounce: 0.3 }}
        className="w-full max-w-md relative"
      >
        <motion.div
          animate={shake ? { x: [-20, 20, -20, 20, -10, 10, 0] } : {}}
          transition={{ duration: 0.5 }}
        >
          <GlassCard className="p-8 backdrop-blur-xl bg-white/80 dark:bg-gray-900/80 border border-white/20 dark:border-gray-700/30 shadow-2xl relative overflow-hidden">
            {/* Décoration supérieure animée */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-400 via-purple-400 to-primary-400 bg-[length:200%_100%] animate-shimmer" />
            
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-primary-400/20 to-purple-400/20 rounded-full blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-tr from-blue-400/20 to-primary-400/20 rounded-full blur-2xl" />

            <div className="text-center mb-8 relative">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', bounce: 0.5 }}
                className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-lg shadow-primary-500/25 relative"
              >
                <Sparkles className="w-9 h-9 text-white" />
                <div className="absolute inset-0 rounded-2xl border-2 border-white/20 animate-pulse" />
              </motion.div>
              
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 bg-[length:200%_100%] animate-shimmer bg-clip-text text-transparent"
              >
                Bienvenue
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-600 dark:text-gray-300"
              >
                Connectez-vous à votre espace SmartRecruit
              </motion.p>

              {loginAttempts > 0 && loginAttempts < 5 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-2 flex items-center justify-center gap-2 text-xs text-yellow-600 dark:text-yellow-400"
                >
                  <AlertCircle className="w-4 h-4" />
                  <span>Tentative {loginAttempts}/5</span>
                </motion.div>
              )}

              {isLocked && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-2 flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400"
                >
                  <Shield className="w-4 h-4" />
                  <span>Compte verrouillé - {countdown}s</span>
                </motion.div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Adresse email
                </label>
                <div className="relative group">
                  <Mail className={`absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                    emailError && emailTouched ? 'text-red-500' : 'text-gray-400 group-focus-within:text-primary-500'
                  }`} />
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={handleEmailChange}
                    onBlur={() => {
                      setEmailTouched(true)
                      setEmailError(validateEmail(email))
                    }}
                    onFocus={() => setEmailTouched(true)}
                    className={`w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/50 dark:bg-gray-800/50 border-2 transition-all duration-300 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 ${
                      emailError && emailTouched
                        ? 'border-red-500 ring-4 ring-red-500/10'
                        : 'border-gray-200/50 dark:border-gray-700/50 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-primary-300'
                    }`}
                    placeholder="votre@email.com"
                    required
                  />
                  {emailError && emailTouched && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm mt-1.5 flex items-center gap-1"
                    >
                      <span className="inline-block w-1 h-1 rounded-full bg-red-500 animate-blink" />
                      {emailError}
                    </motion.p>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  Mot de passe
                </label>
                <div className="relative group">
                  <Lock className={`absolute left-3.5 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
                    passwordError && passwordTouched ? 'text-red-500' : 'text-gray-400 group-focus-within:text-primary-500'
                  }`} />
                  <input
                    type={afficherMotDePasse ? 'text' : 'password'}
                    value={motDePasse}
                    onChange={handlePasswordChange}
                    onBlur={() => {
                      setPasswordTouched(true)
                      setPasswordError(validatePassword(motDePasse))
                    }}
                    onFocus={() => setPasswordTouched(true)}
                    className={`w-full pl-11 pr-12 py-3.5 rounded-xl bg-white/50 dark:bg-gray-800/50 border-2 transition-all duration-300 outline-none text-gray-900 dark:text-white placeholder:text-gray-400 ${
                      passwordError && passwordTouched
                        ? 'border-red-500 ring-4 ring-red-500/10'
                        : 'border-gray-200/50 dark:border-gray-700/50 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 hover:border-primary-300'
                    }`}
                    placeholder="••••••••"
                    required
                  />
                  
                  {isCapsLock && (
                    <div className="absolute right-14 top-1/2 transform -translate-y-1/2">
                      <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-900/50 px-2 py-0.5 rounded text-xs text-yellow-700 dark:text-yellow-300">
                        <span className="uppercase font-bold">Caps</span>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setAfficherMotDePasse(!afficherMotDePasse)}
                    className="absolute right-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200 focus:outline-none p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    tabIndex={-1}
                  >
                    {afficherMotDePasse ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>

                  {passwordError && passwordTouched && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-sm mt-1.5 flex items-center gap-1"
                    >
                      <span className="inline-block w-1 h-1 rounded-full bg-red-500 animate-blink" />
                      {passwordError}
                    </motion.p>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="pt-2"
              >
                <button
                  type="submit"
                  disabled={chargement || isLocked}
                  className="relative w-full py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold text-base overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <span className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  <span className="relative flex items-center justify-center gap-2">
                    {chargement ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Connexion en cours...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-5 h-5" />
                        Se connecter
                      </>
                    )}
                  </span>
                </button>
              </motion.div>
            </form>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="mt-6 text-center"
            >
              <div className="relative flex items-center gap-4 before:flex-1 before:h-px before:bg-gray-200/50 dark:before:bg-gray-700/50 after:flex-1 after:h-px after:bg-gray-200/50 dark:after:bg-gray-700/50">
                <span className="text-sm text-gray-400 dark:text-gray-500 px-3">
                  Pas encore inscrit ?
                </span>
              </div>
              
              <div className="flex gap-3 justify-center mt-4">
                <Link
                  to="/inscription/candidat"
                  className="group flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 text-primary-700 dark:text-primary-400 font-medium transition-all duration-300 hover:shadow-md hover:shadow-primary-500/20 hover:scale-105 active:scale-95 border border-primary-200/30 dark:border-primary-700/30"
                >
                  <User className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                  <span>Candidat</span>
                </Link>
                <Link
                  to="/inscription/entreprise"
                  className="group flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 text-purple-700 dark:text-purple-400 font-medium transition-all duration-300 hover:shadow-md hover:shadow-purple-500/20 hover:scale-105 active:scale-95 border border-purple-200/30 dark:border-purple-700/30"
                >
                  <Building className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                  <span>Entreprise</span>
                </Link>
              </div>
            </motion.div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Connexion
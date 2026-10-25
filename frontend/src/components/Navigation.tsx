import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore, useThemeStore } from '@/store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Menu, X, Sun, Moon, LogOut, Briefcase, User, Users, 
  Building2, Home, Search, LayoutDashboard, FileText, 
  ShieldCheck, MessageSquare, UserPlus, ChevronDown, Droplets
} from 'lucide-react'
// ⭐ IMPORTATION DES FONCTIONS DEPUIS api.ts
import { getCandidatPhotoByUserUrl, getEntrepriseLogoByUserUrl } from '@/services/api'

const Navigation = () => {
  const [menuOuvert, setMenuOuvert] = useState(false)
  const [userDropdownOuvert, setUserDropdownOuvert] = useState(false)
  const [erreurImage, setErreurImage] = useState(false)
  
  const { estConnecte, utilisateur, logout } = useAuthStore()
  const { estModeSombre, toggleTheme } = useThemeStore()
  
  const navigate = useNavigate()
  const location = useLocation()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Réinitialisation de l'erreur si l'utilisateur change
  useEffect(() => {
    setErreurImage(false)
  }, [utilisateur])

  // Fermeture du dropdown au clic externe
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOuvert(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('auth-storage')
    localStorage.removeItem('utilisateur')
    sessionStorage.removeItem('token')
    
    logout()
    setUserDropdownOuvert(false)
    setMenuOuvert(false)
    navigate('/')
    window.location.reload()
  }

  // Navigation dynamique selon rôle
  const getLienNavigation = () => {
    const liens: { nom: string; chemin: string; icone: JSX.Element }[] = [
      { nom: 'Accueil', chemin: '/', icone: <Home className="w-4 h-4" /> }
    ]
    
    if (!estConnecte || !utilisateur) return liens

    const role = utilisateur.role
    
    liens.push(
      { nom: 'Offres', chemin: '/offres', icone: <Search className="w-4 h-4" /> },
      { nom: 'Messages', chemin: '/messagerie', icone: <MessageSquare className="w-4 h-4" /> }
    )
    
    if (role === 'candidat') {
      const statut = utilisateur?.statut_profil
      const dashboardPath = statut === 'employe'
        ? '/dashboard/employe'
        : statut === 'ancien_employe'
        ? '/dashboard/ancien-employe'
        : '/dashboard/candidat'
      
      const dashboardLabel = statut === 'employe'
        ? 'Dashboard salarié'
        : statut === 'ancien_employe'
        ? 'Dashboard ancien'
        : 'Dashboard'

      liens.push(
        { nom: dashboardLabel, chemin: dashboardPath, icone: <LayoutDashboard className="w-4 h-4" /> }
      )
    } else if (role === 'entreprise') {
      liens.push(
        { nom: 'Dashboard', chemin: '/dashboard/entreprise', icone: <LayoutDashboard className="w-4 h-4" /> },
        { nom: 'Candidatures', chemin: '/candidatures', icone: <FileText className="w-4 h-4" /> },
        { nom: 'Employés', chemin: '/employes', icone: <Users className="w-4 h-4" /> },
        { nom: 'Départements', chemin: '/departements', icone: <Building2 className="w-4 h-4" /> }
      )
    } else if (role === 'admin') {
      liens.push(
        { nom: 'Administration', chemin: '/dashboard/admin', icone: <ShieldCheck className="w-4 h-4" /> }
      )
    }

    return liens
  }

  const lienNavigation = getLienNavigation()

  // Nom complet formaté
  const nomComplet = utilisateur 
    ? `${utilisateur.prenom || utilisateur.candidat?.prenom || ''} ${utilisateur.nom || utilisateur.candidat?.nom || ''}`.trim() || utilisateur.nom_entreprise || utilisateur.username || utilisateur.email
    : ''

  // ⭐ URL de la photo (via les fonctions centralisées de api.ts)
  const urlPhotoComplete = utilisateur
    ? (utilisateur.role === 'entreprise' 
        ? getEntrepriseLogoByUserUrl(utilisateur.id) 
        : getCandidatPhotoByUserUrl(utilisateur.id))
    : null

  const getInitiales = () => {
    if (!utilisateur) return 'U'
    const p = (utilisateur.prenom || utilisateur.candidat?.prenom || '')[0] || ''
    const n = (utilisateur.nom || utilisateur.candidat?.nom || '')[0] || ''
    const res = (p + n).toUpperCase()
    return res || (utilisateur.email ? utilisateur.email[0].toUpperCase() : 'U')
  }

  return (
    <header className="sticky top-0 z-50 px-3 sm:px-6 pt-3 pb-2 transition-all duration-300">
      <div className="max-w-7xl mx-auto backdrop-blur-2xl bg-white/40 dark:bg-slate-900/50 border border-emerald-500/20 dark:border-teal-400/20 shadow-[0_8px_32px_0_rgba(16,185,129,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.6)] rounded-3xl transition-all duration-300 relative">
        
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400/40 dark:via-teal-300/30 to-transparent rounded-t-3xl" />

        <div className="flex items-center justify-between h-16 px-4 sm:px-6 relative z-10">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 p-[1px] shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-all duration-300 group-hover:scale-105">
              <div className="w-full h-full bg-white/70 dark:bg-slate-900/80 backdrop-blur-md rounded-[15px] flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-emerald-600 dark:text-teal-400 group-hover:rotate-6 transition-transform duration-300" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
                SmartRecruit
              </span>
              <span className="text-[9px] font-bold text-teal-600/70 dark:text-teal-400/70 uppercase tracking-widest -mt-1 hidden sm:flex items-center gap-1">
                <Droplets className="w-2.5 h-2.5" /> Liquid Glass
              </span>
            </div>
          </Link>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center gap-1 bg-emerald-950/5 dark:bg-slate-800/40 p-1.5 rounded-full border border-emerald-500/15 dark:border-teal-500/15 backdrop-blur-xl shadow-inner">
            {lienNavigation.map((lien) => {
              const estActif = location.pathname === lien.chemin
              return (
                <Link
                  key={lien.chemin}
                  to={lien.chemin}
                  className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
                    estActif
                      ? 'text-emerald-900 dark:text-emerald-200 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-teal-300'
                  }`}
                >
                  {estActif && (
                    <motion.div
                      layoutId="liquid-water-pill"
                      className="absolute inset-0 bg-gradient-to-r from-emerald-400/30 via-teal-300/30 to-cyan-400/30 dark:from-emerald-500/25 dark:via-teal-400/25 dark:to-cyan-500/25 backdrop-blur-md rounded-full shadow-[0_4px_15px_rgba(16,185,129,0.2)] border border-emerald-400/50 dark:border-teal-300/30"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">{lien.icone}</span>
                  <span className="relative z-10">{lien.nom}</span>
                </Link>
              )
            })}
          </nav>

          {/* Actions & Profil */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-full bg-emerald-500/10 dark:bg-slate-800/50 border border-emerald-500/20 dark:border-teal-400/20 text-slate-700 dark:text-slate-200 hover:bg-emerald-500/20 backdrop-blur-md transition-all shadow-sm focus:outline-none"
              aria-label="Changer le thème"
            >
              {estModeSombre ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-teal-600" />}
            </button>

            {!estConnecte ? (
              <div className="flex items-center gap-2 pl-2 border-l border-emerald-500/20 dark:border-slate-700">
                <Link
                  to="/connexion"
                  className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-teal-400 transition-colors"
                >
                  Connexion
                </Link>
                <Link
                  to="/inscription/candidat"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 rounded-full shadow-lg shadow-emerald-500/25 backdrop-blur-md transition-all hover:scale-[1.03] border border-white/20"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  S'inscrire
                </Link>
              </div>
            ) : (
              <div className="relative pl-2 border-l border-emerald-500/20 dark:border-slate-700" ref={dropdownRef}>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setUserDropdownOuvert((prev) => !prev)
                  }}
                  className="flex items-center gap-3 p-1.5 pr-3 rounded-full bg-emerald-500/10 dark:bg-slate-800/60 border border-emerald-500/30 dark:border-teal-400/30 hover:bg-emerald-500/20 backdrop-blur-md transition-all shadow-sm focus:outline-none group cursor-pointer"
                >
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-emerald-400/60 dark:border-teal-400/60 shadow-inner bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                    {urlPhotoComplete && !erreurImage ? (
                      <img 
                        src={urlPhotoComplete} 
                        alt={nomComplet} 
                        className="w-full h-full object-cover"
                        onError={() => setErreurImage(true)}
                      />
                    ) : (
                      <span className="text-white drop-shadow">{getInitiales()}</span>
                    )}
                  </div>

                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[130px] truncate leading-tight group-hover:text-emerald-700 dark:group-hover:text-teal-300 transition-colors">
                      {nomComplet}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-teal-400 capitalize">
                      {utilisateur?.role}
                    </span>
                  </div>

                  <ChevronDown className={`w-3.5 h-3.5 text-emerald-600 dark:text-teal-400 transition-transform duration-300 ${userDropdownOuvert ? 'rotate-180' : ''}`} />
                </button>

                {/* Modal déconnexion & profil */}
                <AnimatePresence>
                  {userDropdownOuvert && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-3 w-64 backdrop-blur-3xl bg-white/95 dark:bg-slate-900/95 rounded-3xl shadow-[0_15px_40px_rgba(16,185,129,0.2)] dark:shadow-[0_15px_40px_rgba(0,0,0,0.8)] border border-emerald-500/30 dark:border-teal-400/30 py-2 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-3 border-b border-emerald-500/10 dark:border-slate-800 flex items-center gap-3 bg-emerald-500/5">
                        <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-400/50 flex-shrink-0 bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-700 dark:text-teal-300">
                          {urlPhotoComplete && !erreurImage ? (
                            <img src={urlPhotoComplete} alt={nomComplet} className="w-full h-full object-cover" />
                          ) : (
                            getInitiales()
                          )}
                        </div>
                        <div className="flex flex-col overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{nomComplet}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{utilisateur?.email}</p>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          to="/profil"
                          onClick={() => setUserDropdownOuvert(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 dark:hover:bg-teal-500/20 transition-colors"
                        >
                          <User className="w-4 h-4 text-emerald-500" />
                          Mon Profil
                        </Link>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 transition-colors text-left"
                        >
                          <LogOut className="w-4 h-4" />
                          Se déconnecter
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Bouton Hamburger Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-2xl bg-emerald-500/10 dark:bg-slate-800/50 border border-emerald-500/20 dark:border-teal-400/20 text-slate-700 dark:text-slate-200"
            >
              {estModeSombre ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-teal-600" />}
            </button>
            <button
              onClick={() => setMenuOuvert(!menuOuvert)}
              className="p-2 rounded-2xl bg-emerald-500/10 dark:bg-slate-800/50 border border-emerald-500/20 dark:border-teal-400/20 text-slate-700 dark:text-slate-200 transition-colors"
            >
              {menuOuvert ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Menu Mobile */}
      <AnimatePresence>
        {menuOuvert && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="md:hidden mt-2 max-w-7xl mx-auto backdrop-blur-3xl bg-white/90 dark:bg-slate-900/95 border border-emerald-500/30 dark:border-teal-400/20 rounded-3xl shadow-2xl overflow-hidden z-40 relative"
          >
            <div className="p-4 space-y-3">
              {estConnecte && (
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/10 dark:bg-slate-800/60 border border-emerald-500/20 dark:border-teal-400/20">
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-emerald-400/50 bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                    {urlPhotoComplete && !erreurImage ? (
                      <img src={urlPhotoComplete} alt={nomComplet} className="w-full h-full object-cover" />
                    ) : (
                      getInitiales()
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{nomComplet}</span>
                    <span className="text-[10px] text-emerald-600 dark:text-teal-400 capitalize font-semibold">{utilisateur?.role}</span>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {lienNavigation.map((lien) => {
                  const estActif = location.pathname === lien.chemin
                  return (
                    <Link
                      key={`mobile-${lien.chemin}`}
                      to={lien.chemin}
                      onClick={() => setMenuOuvert(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                        estActif
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10'
                      }`}
                    >
                      {lien.icone}
                      <span>{lien.nom}</span>
                    </Link>
                  )
                })}
              </div>

              <div className="border-t border-emerald-500/10 dark:border-slate-800 pt-3">
                {!estConnecte ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      to="/connexion"
                      onClick={() => setMenuOuvert(false)}
                      className="flex items-center justify-center py-2.5 px-4 rounded-xl border border-emerald-500/30 text-xs font-semibold text-slate-700 dark:text-slate-200"
                    >
                      Connexion
                    </Link>
                    <Link
                      to="/inscription/candidat"
                      onClick={() => setMenuOuvert(false)}
                      className="flex items-center justify-center py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-xs font-semibold text-white shadow-md"
                    >
                      Inscription
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Link
                      to="/profil"
                      onClick={() => setMenuOuvert(false)}
                      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-emerald-500/10"
                    >
                      <User className="w-4 h-4 text-emerald-500" />
                      <span>Mon Profil</span>
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Déconnexion</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}

export default Navigation
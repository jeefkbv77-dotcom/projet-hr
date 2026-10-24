import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Briefcase, Users, ArrowRight, 
  Sparkles, Rocket, Mail, Phone, 
  MapPin, Heart, Target, Brain, 
  Shield, Compass, Clock, CheckCircle2, UserCheck
} from 'lucide-react'

// Icônes SVG pour les réseaux sociaux
const GithubIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.15 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.62.24 2.85.12 3.15.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
)

const TwitterIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

const LinkedInIcon = () => (
  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
)

const Accueil = () => {
  const fonctionnalites = [
    {
      icone: <Brain className="w-7 h-7" />,
      titre: "Matching Intelligent",
      description: "Algorithme avancé utilisant l'ontologie OWL pour des correspondances intelligentes.",
      gradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
      accent: "group-hover:text-blue-500 dark:group-hover:text-blue-400"
    },
    {
      icone: <Target className="w-7 h-7" />,
      titre: "Ciblage Précis",
      description: "Recommandations personnalisées basées sur vos compétences et aspirations.",
      gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
      accent: "group-hover:text-emerald-500 dark:group-hover:text-emerald-400"
    },
    {
      icone: <Rocket className="w-7 h-7" />,
      titre: "Recrutement Rapide",
      description: "Processus optimisé pour trouver les meilleurs talents en un temps record.",
      gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
      accent: "group-hover:text-amber-500 dark:group-hover:text-amber-400"
    },
    {
      icone: <Shield className="w-7 h-7" />,
      titre: "Sécurité Maximale",
      description: "Données protégées avec les plus hauts standards de confidentialité.",
      gradient: "from-rose-500/20 via-pink-500/10 to-transparent",
      accent: "group-hover:text-rose-500 dark:group-hover:text-rose-400"
    },
    {
      icone: <Compass className="w-7 h-7" />,
      titre: "Orientation Carrière",
      description: "Conseils personnalisés pour développer votre carrière professionnelle.",
      gradient: "from-cyan-500/20 via-sky-500/10 to-transparent",
      accent: "group-hover:text-cyan-500 dark:group-hover:text-cyan-400"
    },
    {
      icone: <Clock className="w-7 h-7" />,
      titre: "Suivi en Temps Réel",
      description: "Suivez vos candidatures et vos entretiens en toute simplicité.",
      gradient: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
      accent: "group-hover:text-violet-500 dark:group-hover:text-violet-400"
    }
  ]

  const statistiques = [
    { nombre: "50K+", label: "Candidats Inscrits" },
    { nombre: "10K+", label: "Entreprises Actives" },
    { nombre: "95%", label: "Taux de Satisfaction" },
    { nombre: "100%", label: "Recrutement Rapide" }
  ]

  return (
    <div className="relative min-h-screen transition-colors duration-500 bg-slate-50 dark:bg-[#0B0F19] text-slate-800 dark:text-slate-100 overflow-hidden selection:bg-primary-500/30">
      
      {/* ARRIÈRE-PLAN DYNAMIQUE ET BULLES LIQUID GLASS */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <motion.div
          className="absolute -top-32 -left-32 w-[30rem] h-[30rem] rounded-full bg-gradient-to-br from-blue-400/30 via-indigo-500/20 to-purple-500/20 dark:from-blue-600/20 dark:via-indigo-600/15 dark:to-purple-800/15 blur-3xl"
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -40, 60, 0],
            scale: [1, 1.15, 0.9, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 -right-32 w-[35rem] h-[35rem] rounded-full bg-gradient-to-br from-cyan-400/25 via-emerald-400/15 to-teal-500/20 dark:from-cyan-600/15 dark:via-emerald-600/10 dark:to-teal-900/15 blur-3xl"
          animate={{
            x: [0, -90, 40, 0],
            y: [0, 60, -50, 0],
            scale: [1, 0.85, 1.1, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 left-1/3 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-fuchsia-400/20 via-purple-500/15 to-pink-500/20 dark:from-fuchsia-800/15 dark:via-purple-900/10 dark:to-pink-900/15 blur-3xl"
          animate={{
            scale: [1, 1.25, 0.8, 1],
            opacity: [0.4, 0.7, 0.4, 0.4],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-40" />
      </div>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 px-4 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Textes et Boutons */}
          <div className="lg:col-span-7 text-center lg:text-left z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800/80 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-xs md:text-sm font-medium text-primary-600 dark:text-primary-400"
            >
              <Sparkles className="w-4 h-4 animate-pulse text-amber-500" />
              <span>Plateforme de Recrutement Nouvelle Génération</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] mb-6"
            >
              L'avenir du recrutement avec{' '}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                SmartRecruit
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 mb-8 leading-relaxed"
            >
              La plateforme moderne qui simplifie la recherche d'emploi et connecte rapidement les talents d'exception avec les meilleures entreprises.
            </motion.p>

            {/* Boutons d'action en Verre Liquide */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
            >
              <Link
                to="/inscription/candidat"
                className="w-full sm:w-auto group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white font-semibold text-base shadow-lg shadow-blue-500/25 dark:shadow-purple-900/30 overflow-hidden transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  Espace Candidat
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>

              <Link
                to="/inscription/entreprise"
                className="w-full sm:w-auto group relative px-8 py-4 rounded-2xl backdrop-blur-xl bg-white/50 dark:bg-slate-900/50 border border-white/80 dark:border-slate-800/80 text-slate-800 dark:text-white font-semibold text-base shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-800/80 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Espace Entreprise
                </span>
              </Link>
            </motion.div>
          </div>

          {/* Image d'En-tête avec Cadre Liquid Glass */}
          <div className="lg:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative mx-auto max-w-md lg:max-w-none"
            >
              {/* Ombre portée liquide */}
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 blur-2xl opacity-70 dark:opacity-40 animate-pulse" />

              {/* Cadre en Verre avec Image */}
              <div className="relative rounded-3xl p-3 backdrop-blur-2xl bg-white/60 dark:bg-slate-900/60 border border-white/80 dark:border-slate-800/80 shadow-[0_20px_50px_rgba(8,_112,_184,_0.12)] dark:shadow-[0_20px_50px_rgba(0,_0,_0,_0.5)] overflow-hidden">
                <img 
                  src="https://www.shutterstock.com/image-vector/manager-responsible-human-resources-presents-260nw-1823849459.jpg" 
                  alt="Équipe de recrutement professionnelle" 
                  className="w-full h-80 sm:h-96 object-cover rounded-2xl"
                />

                {/* Badges Flottants Liquid Glass */}
                <motion.div 
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="absolute bottom-6 left-6 p-3 rounded-2xl backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/80 dark:border-slate-700/80 shadow-lg flex items-center gap-3"
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Profils Vérifiés</div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Entreprises & Candidats</div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="absolute top-6 right-6 p-3 rounded-2xl backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border border-white/80 dark:border-slate-700/80 shadow-lg flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">Candidatures Simples</span>
                </motion.div>
              </div>
            </motion.div>
          </div>

        </div>

        {/* SECTION STATISTIQUES */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mt-16 sm:mt-24"
        >
          {statistiques.map((stat, index) => (
            <div
              key={index}
              className="group relative p-6 rounded-2xl backdrop-blur-xl bg-white/50 dark:bg-slate-900/50 border border-white/80 dark:border-slate-800/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] text-center transition-all duration-300 hover:-translate-y-1 hover:bg-white/70 dark:hover:bg-slate-800/70"
            >
              <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-1">
                {stat.nombre}
              </div>
              <div className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* SECTION FONCTIONNALITÉS */}
      <section className="relative py-20 px-4 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl sm:text-5xl font-extrabold mb-4"
          >
            Pourquoi choisir{' '}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
              SmartRecruit
            </span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-600 dark:text-slate-400 text-base sm:text-lg"
          >
            Des outils simples et performants pour réussir vos recrutements.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {fonctionnalites.map((f, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08 }}
              className="group relative p-8 rounded-3xl backdrop-blur-2xl bg-white/50 dark:bg-slate-900/50 border border-white/80 dark:border-slate-800/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] dark:shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${f.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10`} />

              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center mb-6 text-slate-700 dark:text-slate-300 transition-colors duration-300 group-hover:scale-110">
                <span className={`transition-colors duration-300 ${f.accent}`}>
                  {f.icone}
                </span>
              </div>

              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                {f.titre}
              </h3>

              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SECTION CALL TO ACTION (CTA) */}
      <section className="relative py-16 sm:py-24 px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative rounded-3xl p-8 sm:p-14 text-center backdrop-blur-2xl bg-gradient-to-b from-white/70 to-white/40 dark:from-slate-900/80 dark:to-slate-900/40 border border-white/80 dark:border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden"
        >
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1/2 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-2xl -z-10" />

          <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4">
            Prêt à transformer votre carrière ?
          </h2>

          <p className="text-slate-600 dark:text-slate-300 text-base sm:text-xl max-w-2xl mx-auto mb-8">
            Inscrivez-vous dès aujourd'hui et découvrez vos nouvelles opportunités.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/inscription/candidat"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 text-white font-semibold text-base shadow-lg shadow-blue-500/25 transition-all duration-300 hover:scale-105"
            >
              Créer un compte Candidat
            </Link>
            <Link
              to="/inscription/entreprise"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/80 text-slate-900 dark:text-white font-semibold text-base shadow-sm transition-all duration-300 hover:bg-white/80 dark:hover:bg-slate-800 hover:scale-105"
            >
              Espace Entreprise
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER LIQUID GLASS */}
      <footer className="relative border-t border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl mt-12">
        <div className="max-w-7xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-2 gap-8 items-center justify-between">
            
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
                SmartRecruit
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md">
                La plateforme de recrutement intelligent connectant talents et opportunités.
              </p>
            </div>

            <div className="flex flex-col md:items-end gap-4">
              <ul className="flex flex-wrap gap-4 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-primary-500" />
                  <a href="mailto:jeefkbv77@gmail.com" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                    jeefkbv77@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary-500" />
                  <a href="tel:+243974529067" className="hover:text-slate-900 dark:hover:text-white transition-colors">
                    +243 974529067
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary-500" />
                  <span>RDC</span>
                </li>
              </ul>

              <div className="flex gap-3">
                <a
                  href="#"
                  className="w-9 h-9 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                >
                  <LinkedInIcon />
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-200"
                >
                  <GithubIcon />
                </a>
                <a
                  href="#"
                  className="w-9 h-9 rounded-xl bg-white/60 dark:bg-slate-800/60 border border-white/80 dark:border-slate-700/80 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-sky-500 transition-all duration-200"
                >
                  <TwitterIcon />
                </a>
              </div>
            </div>

          </div>

          <div className="border-t border-slate-200/50 dark:border-slate-800/50 mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 dark:text-slate-500">
            <p>© 2026 SmartRecruit. Tous droits réservés.</p>
            <p className="flex items-center gap-1">
              Fait avec <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> en RDC
            </p>
          </div>
        </div>
      </footer>

    </div>
  )
}

export default Accueil
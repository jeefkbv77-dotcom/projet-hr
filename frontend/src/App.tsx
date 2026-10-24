// src/App.tsx - Version corrigée
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/useStore'
import { useThemeStore } from './store/useStore'
import { useEffect } from 'react'
import Notification from './components/Notification'
import Navigation from './components/Navigation'

// Pages
import Accueil from './pages/Accueil'
import Connexion from './pages/Connexion'
import InscriptionCandidat from './pages/InscriptionCandidat'
import InscriptionEntreprise from './pages/InscriptionEntreprise'
import DashboardCandidat from './pages/DashboardCandidat'
import DashboardEntreprise from './pages/DashboardEntreprise'
import DashboardAdmin from './pages/DashboardAdmin'
import RechercheOffres from './pages/RechercheOffres'
import OffreDetail from './pages/OffreDetail'
import ProfilCandidat from './pages/ProfilCandidat'
import DashboardEmploye from './pages/DashboardEmploye'
import DashboardAncienEmploye from './pages/DashboardAncienEmploye'
import Messagerie from './pages/Messagerie'
import Employes from './pages/Employes'
import Departements from './pages/Departements'
import Candidatures from './pages/Candidatures'

function App() {
  const { estModeSombre } = useThemeStore()
  const { estConnecte, utilisateur, refreshUser } = useAuthStore()

  useEffect(() => {
    if (estModeSombre) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [estModeSombre])

  useEffect(() => {
    if (estConnecte) {
      refreshUser()
    }
  }, [estConnecte])

  const hasRole = (role: string | string[]) => {
    if (!utilisateur || !utilisateur.role) return false
    if (Array.isArray(role)) {
      return role.includes(utilisateur.role)
    }
    return utilisateur.role === role
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <Notification />
        <Navigation />
        
        <main className="container mx-auto px-4 py-8 max-w-7xl">
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<Accueil />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/inscription/candidat" element={<InscriptionCandidat />} />
            <Route path="/inscription/entreprise" element={<InscriptionEntreprise />} />
            
            {/* Offres - Accessible à tous */}
            <Route
              path="/offres"
              element={
                estConnecte ? (
                  <RechercheOffres />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            
            {/* Détail d'une offre - Accessible à tous */}
            <Route
              path="/offres/:id"
              element={
                estConnecte ? (
                  <OffreDetail />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            
            {/* Routes Candidat */}
            <Route
              path="/profil"
              element={
                estConnecte && hasRole('candidat') ? (
                  <ProfilCandidat />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            
            <Route
              path="/dashboard/candidat"
              element={
                estConnecte && hasRole('candidat') && utilisateur?.statut_profil === 'candidat' ? (
                  <DashboardCandidat />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            <Route
              path="/dashboard/employe"
              element={
                estConnecte && hasRole('candidat') && utilisateur?.statut_profil === 'employe' ? (
                  <DashboardEmploye />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            <Route
              path="/dashboard/ancien-employe"
              element={
                estConnecte && hasRole('candidat') && utilisateur?.statut_profil === 'ancien_employe' ? (
                  <DashboardAncienEmploye />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            <Route
              path="/messagerie"
              element={
                estConnecte ? (
                  <Messagerie />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            
            {/* Routes Entreprise */}
            <Route
              path="/dashboard/entreprise"
              element={
                estConnecte && hasRole('entreprise') ? (
                  <DashboardEntreprise />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            
            <Route
              path="/candidatures"
              element={
                estConnecte && hasRole('entreprise') ? (
                  <Candidatures />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            
            <Route
              path="/employes"
              element={
                estConnecte && hasRole('entreprise') ? (
                  <Employes />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            
            <Route
              path="/departements"
              element={
                estConnecte && hasRole('entreprise') ? (
                  <Departements />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            
            {/* Routes Admin */}
            <Route
              path="/dashboard/admin"
              element={
                estConnecte && hasRole('admin') ? (
                  <DashboardAdmin />
                ) : (
                  <Navigate to="/connexion" replace />
                )
              }
            />
            
            {/* Redirection */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
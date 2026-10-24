# backend/app/services/matching_service.py
"""
Service de matching intelligent entre candidats et offres
"""
from typing import List, Dict, Tuple, Optional
from app.services.ontology_service import ontology_service
import logging

logger = logging.getLogger(__name__)


class MatchingService:
    """Service pour le matching intelligent candidats-offres"""
    
    def calculer_compatibilite(
        self,
        competences_candidat: List[str],
        competences_requises: List[str]
    ) -> Dict:
        """
        Calculer le score de compatibilité entre un candidat et un poste
        
        Args:
            competences_candidat: Liste des compétences du candidat
            competences_requises: Liste des compétences requises pour le poste
            
        Returns:
            Dictionnaire contenant le score et les détails
        """
        if not competences_requises:
            return {
                "score": 100,
                "competences_matchees": [],
                "competences_manquantes": [],
                "details": "Aucune compétence requise",
                "total_requises": 0,
                "total_matchees": 0
            }
        
        # Normaliser les compétences en minuscules pour la comparaison
        competences_candidat_norm = [c.lower().strip() for c in competences_candidat]
        competences_requises_norm = [c.lower().strip() for c in competences_requises]
        
        # Calculer les compétences matchées
        competences_matchees = []
        competences_manquantes = []
        
        for req in competences_requises_norm:
            if req in competences_candidat_norm:
                # Trouver le nom original de la compétence
                idx = competences_requises_norm.index(req)
                competences_matchees.append(competences_requises[idx])
            else:
                idx = competences_requises_norm.index(req)
                competences_manquantes.append(competences_requises[idx])
        
        # Calculer le score
        total_requises = len(competences_requises)
        total_matchees = len(competences_matchees)
        score = int((total_matchees / total_requises) * 100) if total_requises > 0 else 100
        
        # Déterminer le niveau de compatibilité
        if score >= 80:
            niveau = "Excellent"
        elif score >= 60:
            niveau = "Bon"
        elif score >= 40:
            niveau = "Moyen"
        else:
            niveau = "Faible"
        
        return {
            "score": score,
            "niveau": niveau,
            "competences_matchees": competences_matchees,
            "competences_manquantes": competences_manquantes,
            "total_requises": total_requises,
            "total_matchees": total_matchees,
            "details": f"{total_matchees} compétences matchées sur {total_requises}"
        }
    
    def calculer_compatibilite_owl(
        self,
        candidat_id: str,
        offre_id: str
    ) -> Dict:
        """
        Calculer la compatibilité en utilisant l'ontologie OWL
        
        Args:
            candidat_id: ID du candidat
            offre_id: ID de l'offre
            
        Returns:
            Dictionnaire contenant le score et les détails
        """
        try:
            # Récupérer les compétences depuis l'ontologie
            competences_candidat = ontology_service.get_candidat_competences(candidat_id)
            competences_offre = ontology_service.get_offre_competences(offre_id)
            
            logger.debug(f"Compétences candidat {candidat_id}: {competences_candidat}")
            logger.debug(f"Compétences offre {offre_id}: {competences_offre}")
            
            return self.calculer_compatibilite(competences_candidat, competences_offre)
            
        except Exception as e:
            logger.error(f"Erreur calcul compatibilité OWL: {e}")
            return {
                "score": 0,
                "niveau": "Erreur",
                "competences_matchees": [],
                "competences_manquantes": [],
                "total_requises": 0,
                "total_matchees": 0,
                "details": f"Erreur: {str(e)}"
            }
    
    def calculer_score_offre_candidat(
        self,
        candidat_id: int,
        offre_id: int
    ) -> int:
        """
        Calculer le score de compatibilité entre un candidat et une offre spécifique
        
        Args:
            candidat_id: ID du candidat
            offre_id: ID de l'offre
            
        Returns:
            Score de compatibilité (0-100)
        """
        resultat = self.calculer_compatibilite_owl(str(candidat_id), str(offre_id))
        return resultat.get("score", 0)
    
    def trouver_offres_recommandees(
        self,
        candidat_id: str,
        offres_disponibles: List[Dict]
    ) -> List[Dict]:
        """
        Trouver les offres recommandées pour un candidat
        
        Args:
            candidat_id: ID du candidat
            offres_disponibles: Liste des offres disponibles avec leurs compétences
            
        Returns:
            Liste des offres classées par score de compatibilité
        """
        if not offres_disponibles:
            return []
        
        offres_avec_score = []
        
        for offre in offres_disponibles:
            try:
                offre_id = str(offre.get("id"))
                competences_requises = offre.get("competences", [])
                
                # Si l'offre n'a pas de compétences, extraire de l'ontologie
                if not competences_requises:
                    competences_requises = ontology_service.get_offre_competences(offre_id)
                
                resultat = self.calculer_compatibilite_owl(candidat_id, offre_id)
                
                offre_avec_score = {
                    **offre,
                    "score_compatibilite": resultat["score"],
                    "niveau_compatibilite": resultat.get("niveau", "Inconnu"),
                    "competences_matchees": resultat["competences_matchees"],
                    "competences_manquantes": resultat["competences_manquantes"]
                }
                offres_avec_score.append(offre_avec_score)
                
            except Exception as e:
                logger.error(f"Erreur calcul score pour offre {offre.get('id')}: {e}")
                # Ajouter l'offre avec un score de 0
                offre_avec_score = {
                    **offre,
                    "score_compatibilite": 0,
                    "niveau_compatibilite": "Erreur",
                    "competences_matchees": [],
                    "competences_manquantes": []
                }
                offres_avec_score.append(offre_avec_score)
        
        # Trier par score décroissant
        offres_avec_score.sort(key=lambda x: x["score_compatibilite"], reverse=True)
        
        return offres_avec_score
    
    def trouver_candidats_recommandes(
        self,
        offre_id: str,
        candidats_disponibles: List[Dict]
    ) -> List[Dict]:
        """
        Trouver les candidats recommandés pour un poste
        
        Args:
            offre_id: ID de l'offre
            candidats_disponibles: Liste des candidats disponibles avec leurs compétences
            
        Returns:
            Liste des candidats classés par score de compatibilité
        """
        if not candidats_disponibles:
            return []
        
        candidats_avec_score = []
        
        for candidat in candidats_disponibles:
            try:
                candidat_id = str(candidat.get("id"))
                resultat = self.calculer_compatibilite_owl(candidat_id, offre_id)
                
                candidat_avec_score = {
                    **candidat,
                    "score_compatibilite": resultat["score"],
                    "niveau_compatibilite": resultat.get("niveau", "Inconnu"),
                    "competences_matchees": resultat["competences_matchees"],
                    "competences_manquantes": resultat["competences_manquantes"]
                }
                candidats_avec_score.append(candidat_avec_score)
                
            except Exception as e:
                logger.error(f"Erreur calcul score pour candidat {candidat.get('id')}: {e}")
                candidat_avec_score = {
                    **candidat,
                    "score_compatibilite": 0,
                    "niveau_compatibilite": "Erreur",
                    "competences_matchees": [],
                    "competences_manquantes": []
                }
                candidats_avec_score.append(candidat_avec_score)
        
        # Trier par score décroissant
        candidats_avec_score.sort(key=lambda x: x["score_compatibilite"], reverse=True)
        
        return candidats_avec_score
    
    def generer_rapport_matching(
        self,
        candidat_id: str,
        offre_id: str
    ) -> str:
        """
        Générer un rapport détaillé de matching
        
        Args:
            candidat_id: ID du candidat
            offre_id: ID de l'offre
            
        Returns:
            Rapport textuel du matching
        """
        resultat = self.calculer_compatibilite_owl(candidat_id, offre_id)
        
        rapport = f"""
=== RAPPORT DE MATCHING ===

Candidat: {candidat_id}
Offre: {offre_id}

Score de compatibilité: {resultat['score']}% - {resultat.get('niveau', 'Inconnu')}

Compétences requises: {resultat['total_requises']}
Compétences matchées: {resultat['total_matchees']}

✅ Compétences possédées:
"""
        for comp in resultat['competences_matchees']:
            rapport += f"  ✓ {comp}\n"
        
        if not resultat['competences_matchees']:
            rapport += "  (Aucune)\n"
        
        rapport += "\n❌ Compétences manquantes:\n"
        for comp in resultat['competences_manquantes']:
            rapport += f"  ✗ {comp}\n"
        
        if not resultat['competences_manquantes']:
            rapport += "  (Aucune - Profil parfait !)\n"
        
        rapport += f"\n📊 Détail: {resultat['details']}\n"
        rapport += "=" * 40 + "\n"
        
        return rapport
    
    def get_competences_manquantes(
        self,
        candidat_id: str,
        offre_id: str
    ) -> List[str]:
        """
        Récupérer la liste des compétences manquantes pour un candidat
        
        Args:
            candidat_id: ID du candidat
            offre_id: ID de l'offre
            
        Returns:
            Liste des compétences manquantes
        """
        resultat = self.calculer_compatibilite_owl(candidat_id, offre_id)
        return resultat.get("competences_manquantes", [])


# Instance globale du service de matching
matching_service = MatchingService()
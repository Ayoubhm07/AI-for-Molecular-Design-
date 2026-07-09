// Donnees d'analyse pour la page Insights.
//
// Ces valeurs illustrent les resultats typiques des notebooks du POC
// (classification, regression, clustering, importance des descripteurs,
// activity cliffs). Elles sont representatives et servent a la visualisation.
// Pour afficher les vrais chiffres, il suffit de remplacer ces constantes par
// les sorties reelles des notebooks.

export interface MetriqueModele {
  nom: string;
  accuracy?: number;
  f1?: number;
  auc?: number;
  r2?: number;
  rmse?: number;
  couleur: string;
}

// Performance des modeles de classification (actif / inactif)
export const CLASSIFICATION: MetriqueModele[] = [
  { nom: "Regression Logistique", accuracy: 0.78, f1: 0.79, auc: 0.85, couleur: "#64748b" },
  { nom: "Random Forest", accuracy: 0.86, f1: 0.87, auc: 0.92, couleur: "#22d3ee" },
  { nom: "XGBoost", accuracy: 0.88, f1: 0.89, auc: 0.94, couleur: "#34d399" },
];

// Performance des modeles de regression (pIC50)
export const REGRESSION: MetriqueModele[] = [
  { nom: "Regression Lineaire", r2: 0.52, rmse: 0.98, couleur: "#64748b" },
  { nom: "Random Forest", r2: 0.71, rmse: 0.74, couleur: "#22d3ee" },
  { nom: "XGBoost", r2: 0.74, rmse: 0.7, couleur: "#34d399" },
];

// Importance des descripteurs physico-chimiques (classification)
export interface Importance {
  descripteur: string;
  valeur: number;
}
export const IMPORTANCES: Importance[] = [
  { descripteur: "Accepteurs H", valeur: 0.24 },
  { descripteur: "Poids moleculaire", valeur: 0.21 },
  { descripteur: "LogP", valeur: 0.18 },
  { descripteur: "Anneaux aromatiques", valeur: 0.15 },
  { descripteur: "TPSA", valeur: 0.12 },
  { descripteur: "Donneurs H", valeur: 0.06 },
  { descripteur: "Liaisons rotatives", valeur: 0.04 },
];

// Familles chimiques issues du clustering (KMeans)
export interface Famille {
  id: number;
  nom: string;
  taille: number;
  pIC50Moyen: number;
  tauxActifs: number; // pourcentage
  couleur: string;
  // Profil moyen normalise 0 a 1 sur 5 axes, pour le radar
  profil: { axe: string; valeur: number }[];
}

export const FAMILLES: Famille[] = [
  {
    id: 0,
    nom: "Quinazolines actives",
    taille: 412,
    pIC50Moyen: 7.6,
    tauxActifs: 74,
    couleur: "#22d3ee",
    profil: [
      { axe: "Poids", valeur: 0.72 },
      { axe: "LogP", valeur: 0.6 },
      { axe: "Aromatiques", valeur: 0.9 },
      { axe: "Accepteurs H", valeur: 0.8 },
      { axe: "TPSA", valeur: 0.65 },
    ],
  },
  {
    id: 1,
    nom: "Petites molecules polaires",
    taille: 338,
    pIC50Moyen: 5.2,
    tauxActifs: 28,
    couleur: "#34d399",
    profil: [
      { axe: "Poids", valeur: 0.3 },
      { axe: "LogP", valeur: 0.25 },
      { axe: "Aromatiques", valeur: 0.4 },
      { axe: "Accepteurs H", valeur: 0.55 },
      { axe: "TPSA", valeur: 0.7 },
    ],
  },
  {
    id: 2,
    nom: "Structures lipophiles",
    taille: 291,
    pIC50Moyen: 6.1,
    tauxActifs: 47,
    couleur: "#a78bfa",
    profil: [
      { axe: "Poids", valeur: 0.6 },
      { axe: "LogP", valeur: 0.85 },
      { axe: "Aromatiques", valeur: 0.7 },
      { axe: "Accepteurs H", valeur: 0.35 },
      { axe: "TPSA", valeur: 0.3 },
    ],
  },
  {
    id: 3,
    nom: "Grosses molecules complexes",
    taille: 187,
    pIC50Moyen: 6.8,
    tauxActifs: 58,
    couleur: "#f59e0b",
    profil: [
      { axe: "Poids", valeur: 0.95 },
      { axe: "LogP", valeur: 0.55 },
      { axe: "Aromatiques", valeur: 0.8 },
      { axe: "Accepteurs H", valeur: 0.7 },
      { axe: "TPSA", valeur: 0.85 },
    ],
  },
];

// Activity cliffs : paires de molecules tres similaires mais aux activites opposees
export interface Cliff {
  molA: string;
  molB: string;
  similarite: number;
  pIC50A: number;
  pIC50B: number;
}
export const CLIFFS: Cliff[] = [
  { molA: "CHEMBL1173", molB: "CHEMBL2028", similarite: 0.91, pIC50A: 8.4, pIC50B: 5.1 },
  { molA: "CHEMBL3092", molB: "CHEMBL3110", similarite: 0.88, pIC50A: 7.9, pIC50B: 4.8 },
  { molA: "CHEMBL0455", molB: "CHEMBL0461", similarite: 0.86, pIC50A: 8.1, pIC50B: 5.5 },
  { molA: "CHEMBL2771", molB: "CHEMBL2790", similarite: 0.84, pIC50A: 7.4, pIC50B: 4.9 },
];

// Chiffres cles du jeu de donnees
export const STATS_GLOBALES = {
  molecules: 5238,
  actives: 2847,
  inactives: 2391,
  descripteurs: 7,
  bitsEmpreinte: 2048,
  familles: 4,
};

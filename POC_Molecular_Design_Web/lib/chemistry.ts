// Logique chimique isolee pour la demo autonome.
//
// Ce module fournit des predictions realistes basees sur des regles chimiques
// simples calculees a partir du SMILES. Il est volontairement isole pour etre
// remplace facilement par les vrais modeles scikit-learn via le backend FastAPI
// (voir README, section "Brancher les vrais modeles").

export interface Proprietes {
  poidsMoleculaire: number;
  logP: number;
  donneursH: number;
  accepteursH: number;
  atomesLourds: number;
  anneauxAromatiques: number;
  respecteLipinski: boolean;
}

export interface Prediction {
  smiles: string;
  valide: boolean;
  actif: boolean;
  confiance: number; // 0 a 1
  pIC50: number;
  proprietes: Proprietes;
}

// Estimation grossiere des proprietes a partir du SMILES.
// Ce n'est pas de la vraie cheminformatique (ce serait le role de RDKit cote
// Python), mais une approximation coherente qui suffit a une demo visuelle.
export function estimerProprietes(smiles: string): Proprietes {
  const s = smiles.trim();

  const carbones = (s.match(/C/gi) || []).length;
  const azotes = (s.match(/N/gi) || []).length;
  const oxygenes = (s.match(/O/gi) || []).length;
  const soufres = (s.match(/S/gi) || []).length;
  const aromatiquesMinuscules = (s.match(/[cnos]/g) || []).length;
  const anneauxChiffres = (s.match(/[1-9]/g) || []).length;

  const atomesLourds = carbones + azotes + oxygenes + soufres;
  const poidsMoleculaire = Math.round(
    carbones * 12 + azotes * 14 + oxygenes * 16 + soufres * 32 + atomesLourds * 1.5
  );

  // LogP approche : les carbones augmentent l'hydrophobie, N et O la baissent
  const logP = Math.round((carbones * 0.5 - (azotes + oxygenes) * 0.7) * 10) / 10;

  const donneursH = (s.match(/N|O/gi) || []).filter(() => Math.random() > 0.5).length;
  const accepteursH = azotes + oxygenes;
  const anneauxAromatiques = Math.round(aromatiquesMinuscules / 6 + anneauxChiffres / 2);

  const respecteLipinski =
    poidsMoleculaire <= 500 && logP <= 5 && donneursH <= 5 && accepteursH <= 10;

  return {
    poidsMoleculaire,
    logP,
    donneursH,
    accepteursH,
    atomesLourds,
    anneauxAromatiques,
    respecteLipinski,
  };
}

// Validation minimale d'un SMILES (heuristique, pas un vrai parseur).
export function smilesValide(smiles: string): boolean {
  const s = smiles.trim();
  if (s.length < 2) return false;
  // Doit contenir au moins un atome de carbone ou d'azote
  if (!/[CcNn]/.test(s)) return false;
  // Parentheses equilibrees
  let profondeur = 0;
  for (const ch of s) {
    if (ch === "(") profondeur++;
    if (ch === ")") profondeur--;
    if (profondeur < 0) return false;
  }
  return profondeur === 0;
}

// Score pseudo deterministe base sur la structure, pour que la meme molecule
// donne toujours le meme resultat (indispensable pour une demo credible).
function empreinteNumerique(smiles: string): number {
  let hash = 0;
  for (let i = 0; i < smiles.length; i++) {
    hash = (hash * 31 + smiles.charCodeAt(i)) % 100000;
  }
  return hash;
}

export function predire(smiles: string): Prediction {
  const valide = smilesValide(smiles);
  const proprietes = estimerProprietes(smiles);

  if (!valide) {
    return {
      smiles,
      valide: false,
      actif: false,
      confiance: 0,
      pIC50: 0,
      proprietes,
    };
  }

  const empreinte = empreinteNumerique(smiles);

  // Les molecules riches en azotes aromatiques et de taille moyenne sont plus
  // souvent des inhibiteurs de kinases. On code cette intuition de facon
  // continue puis on la melange a l'empreinte pour un peu de variete.
  const scoreAzote = Math.min(proprietes.accepteursH / 8, 1);
  const scoreTaille =
    proprietes.poidsMoleculaire >= 250 && proprietes.poidsMoleculaire <= 500 ? 1 : 0.4;
  const scoreAromatique = Math.min(proprietes.anneauxAromatiques / 3, 1);
  const bruit = (empreinte % 1000) / 1000;

  const scoreBrut =
    0.4 * scoreAzote + 0.3 * scoreTaille + 0.2 * scoreAromatique + 0.1 * bruit;

  const pIC50 = Math.round((4 + scoreBrut * 5) * 100) / 100; // entre 4 et 9
  const actif = pIC50 >= 6;
  const confiance = Math.round((0.5 + Math.abs(pIC50 - 6) / 6) * 100) / 100;

  return {
    smiles,
    valide: true,
    actif,
    confiance: Math.min(confiance, 0.99),
    pIC50,
    proprietes,
  };
}

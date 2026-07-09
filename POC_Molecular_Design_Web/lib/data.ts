// Donnees de reference pour la demo : molecules connues, exemples de SMILES,
// et nuage de points pour la carte de l'espace chimique.

export interface MoleculeConnue {
  nom: string;
  smiles: string;
  pIC50: number;
  actif: boolean;
}

// Petit catalogue d'inhibiteurs et de molecules temoins.
export const CATALOGUE: MoleculeConnue[] = [
  { nom: "Gefitinib", smiles: "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1", pIC50: 8.4, actif: true },
  { nom: "Erlotinib", smiles: "C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1", pIC50: 8.1, actif: true },
  { nom: "Lapatinib", smiles: "CS(=O)(=O)CCNCc1oc(-c2ccc3ncnc(Nc4ccc(OCc5cccc(F)c5)c(Cl)c4)c3c2)cc1", pIC50: 7.9, actif: true },
  { nom: "Afatinib", smiles: "CN(C)CC=CC(=O)Nc1cc2c(Nc3ccc(F)c(Cl)c3)ncnc2cc1OC1CCOC1", pIC50: 8.6, actif: true },
  { nom: "Osimertinib", smiles: "COc1cc(N(C)CCN(C)C)c(NC(=O)C=C)cc1Nc1nccc(-c2cn(C)c3ccccc23)n1", pIC50: 8.8, actif: true },
  { nom: "Caffeine", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C", pIC50: 4.2, actif: false },
  { nom: "Aspirin", smiles: "CC(=O)Oc1ccccc1C(=O)O", pIC50: 3.9, actif: false },
  { nom: "Paracetamol", smiles: "CC(=O)Nc1ccc(O)cc1", pIC50: 4.1, actif: false },
  { nom: "Ibuprofen", smiles: "CC(C)Cc1ccc(C(C)C(=O)O)cc1", pIC50: 4.4, actif: false },
  { nom: "Nicotine", smiles: "CN1CCCC1c1cccnc1", pIC50: 4.6, actif: false },
];

export const EXEMPLES_SMILES = [
  { label: "Gefitinib (inhibiteur EGFR)", smiles: "COc1cc2ncnc(Nc3ccc(F)c(Cl)c3)c2cc1OCCCN1CCOCC1" },
  { label: "Caffeine", smiles: "CN1C=NC2=C1C(=O)N(C(=O)N2C)C" },
  { label: "Aspirine", smiles: "CC(=O)Oc1ccccc1C(=O)O" },
  { label: "Erlotinib", smiles: "C#Cc1cccc(Nc2ncnc3cc(OCCOC)c(OCCOC)cc23)c1" },
];

// Nuage de points pre calcule pour la carte de l'espace chimique.
// Genere de facon deterministe pour eviter tout appel externe.
export interface PointCarte {
  x: number;
  y: number;
  pIC50: number;
  actif: boolean;
  nom?: string;
}

function genererNuage(): PointCarte[] {
  const points: PointCarte[] = [];
  let seed = 42;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };

  // Deux amas : actifs regroupes, inactifs disperses
  for (let i = 0; i < 220; i++) {
    const actif = rand() > 0.55;
    const cx = actif ? 0.62 : 0.35;
    const cy = actif ? 0.58 : 0.42;
    const etalement = actif ? 0.14 : 0.22;
    const x = Math.min(0.97, Math.max(0.03, cx + (rand() - 0.5) * etalement));
    const y = Math.min(0.97, Math.max(0.03, cy + (rand() - 0.5) * etalement));
    const pIC50 = actif ? 6 + rand() * 3 : 3.5 + rand() * 2.3;
    points.push({ x, y, pIC50: Math.round(pIC50 * 10) / 10, actif });
  }

  // Quelques molecules connues comme reperes
  const reperes: [string, number, number][] = [
    ["Gefitinib", 0.7, 0.65],
    ["Osimertinib", 0.68, 0.52],
    ["Caffeine", 0.3, 0.38],
    ["Aspirine", 0.25, 0.48],
  ];
  reperes.forEach(([nom, x, y]) => {
    const mol = CATALOGUE.find((m) => m.nom === nom);
    points.push({ x, y, pIC50: mol?.pIC50 ?? 6, actif: mol?.actif ?? true, nom });
  });

  return points;
}

export const NUAGE_CARTE = genererNuage();

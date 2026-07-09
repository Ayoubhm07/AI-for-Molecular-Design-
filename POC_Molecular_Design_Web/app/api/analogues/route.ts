import { NextResponse } from "next/server";
import { CATALOGUE } from "@/lib/data";
import { estimerProprietes } from "@/lib/chemistry";

// GET /api/analogues?smiles=...
//
// Renvoie les molecules connues les plus proches de la requete. La similarite
// ici est approchee (basee sur les proprietes estimees). Le vrai systeme
// utilise la similarite de Tanimoto sur les empreintes de Morgan cote Python.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const smiles = searchParams.get("smiles") ?? "";

  if (!smiles) {
    return NextResponse.json({ error: "SMILES manquant." }, { status: 400 });
  }

  const cible = estimerProprietes(smiles);

  const scored = CATALOGUE.map((mol) => {
    const p = estimerProprietes(mol.smiles);
    // Distance normalisee sur quelques proprietes, transformee en similarite
    const d =
      Math.abs(p.poidsMoleculaire - cible.poidsMoleculaire) / 500 +
      Math.abs(p.logP - cible.logP) / 8 +
      Math.abs(p.accepteursH - cible.accepteursH) / 10;
    const similarite = Math.max(0, 1 - d / 3);
    return { ...mol, similarite: Math.round(similarite * 100) / 100 };
  })
    .sort((a, b) => b.similarite - a.similarite)
    .slice(0, 5);

  return NextResponse.json({ analogues: scored });
}

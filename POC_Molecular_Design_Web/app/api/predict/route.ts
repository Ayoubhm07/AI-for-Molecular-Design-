import { NextResponse } from "next/server";
import { predire } from "@/lib/chemistry";

// POST /api/predict  body: { smiles: string }
//
// Renvoie la prediction d'activite pour une molecule. Pour brancher les vrais
// modeles scikit-learn, remplacer le corps de cette fonction par un appel fetch
// vers le backend FastAPI (voir README).
export async function POST(request: Request) {
  try {
    const { smiles } = await request.json();
    if (typeof smiles !== "string") {
      return NextResponse.json({ error: "SMILES manquant." }, { status: 400 });
    }
    const prediction = predire(smiles);
    return NextResponse.json(prediction);
  } catch {
    return NextResponse.json({ error: "Requete invalide." }, { status: 400 });
  }
}

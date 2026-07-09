"use client";

import { useEffect, useRef, useState } from "react";
import SmilesDrawer from "smiles-drawer";

interface MoleculeDrawingProps {
  smiles: string;
  taille?: number;
}

// Dessine la structure 2D reelle d'une molecule a partir de son SMILES,
// directement dans le navigateur avec SmilesDrawer (aucun backend Python).
export function MoleculeDrawing({ smiles, taille = 300 }: MoleculeDrawingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    if (!smiles || !canvasRef.current) return;
    const canvas = canvasRef.current;

    const drawer = new SmilesDrawer.Drawer({
      width: taille,
      height: taille,
      bondThickness: 1.1,
      atomVisualization: "default",
      compactDrawing: false,
      terminalCarbons: true,
      explicitHydrogens: false,
    });

    setErreur(false);
    SmilesDrawer.parse(
      smiles,
      (tree) => {
        try {
          // Le theme dark colore les atomes en clair sur fond sombre.
          drawer.draw(tree, canvas, "dark", false);
        } catch {
          setErreur(true);
        }
      },
      () => setErreur(true)
    );
  }, [smiles, taille]);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="rounded-2xl border border-white/10 bg-base-900/40 p-3">
        <canvas
          ref={canvasRef}
          width={taille}
          height={taille}
          aria-label={`Structure 2D de la molecule ${smiles}`}
          className={erreur ? "hidden" : "block"}
        />
        {erreur && (
          <div
            className="flex items-center justify-center text-center text-sm text-slate-500"
            style={{ width: taille, height: taille }}
          >
            Structure non representable pour ce SMILES.
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">Structure 2D reconstruite</p>
    </div>
  );
}

// Recompile le crate Rust molcore en WebAssembly et copie l'artefact dans public/.
// Multiplateforme (Windows, macOS, Linux). Lancement : npm run build:wasm
//
// Rappel : le crate est du wasm brut sans compilateur C. Assure-toi que cargo
// est sur le PATH (rustup l'ajoute ; en Git Bash faire au besoin
// export PATH="$HOME/.cargo/bin:$PATH").

import { execSync } from "node:child_process";
import { copyFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const racine = join(dirname(fileURLToPath(import.meta.url)), "..");
const crate = join(racine, "rust");
const artefact = join(
  crate,
  "target",
  "wasm32-unknown-unknown",
  "release",
  "molcore.wasm"
);
const destination = join(racine, "public", "molcore.wasm");

console.log("Compilation du crate Rust molcore...");
execSync("cargo build --target wasm32-unknown-unknown --release", {
  cwd: crate,
  stdio: "inherit",
});

copyFileSync(artefact, destination);
const ko = (statSync(destination).size / 1024).toFixed(1);
console.log(`Artefact copie dans public/molcore.wasm (${ko} Ko).`);

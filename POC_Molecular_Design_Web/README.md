# Nucleus, le site de AI for Molecular Design

Site web Next.js qui sert de vitrine et d'outil d'utilisation au POC de decouverte de medicaments contre l'EGFR. Theme laboratoire du futur, molecule 3D interactive, glassmorphism, animations soignees.

## Lancer le site

```
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

## Moteur Rust / WebAssembly

Les proprietes des molecules et la similarite entre elles sont calculees par un
vrai moteur cheminformatique ecrit en Rust et compile en WebAssembly, qui tourne
dans le navigateur. Il remplace les anciennes approximations JavaScript. Le code
Rust vit dans rust/ et l'artefact compile est public/molcore.wasm, charge en lazy
cote client par lib/wasm/molcore.ts. Si le WebAssembly ne se charge pas, le site
retombe automatiquement sur le calcul JavaScript, la demo ne casse jamais.

Choix technique : le crate est compile en WebAssembly brut, sans wasm-bindgen ni
compilateur C, parce que la machine de developpement n'a pas de linker C
fonctionnel. Voir rust/README.md pour le detail.

Recompiler le moteur apres une modification du code Rust :

```
npm run build:wasm
```

Verifier le moteur (charge le wasm dans Node et teste benzene, ethanol, Tanimoto) :

```
npm run verify:wasm
```

La page Analytics contient une carte de benchmark qui compare, en direct dans le
navigateur, le temps de calcul de la similarite en JavaScript et en Rust. La
mesure est reelle, rien n'est code en dur, et les chiffres varient selon la
machine.

Limite assumee : le parseur SMILES et l'empreinte sont des modeles simplifies,
pas RDKit. C'est un outil de demonstration et d'aide a la decision, pas un
verdict scientifique.

Pour une version de production :

```
npm run build
npm start
```

## Ce que contient le site

Trois pages :

La page d'accueil raconte l'histoire du projet en scrollant. Elle s'ouvre sur une molecule 3D interactive qui tourne et reagit a la souris, suivie des sections probleme, solution, comment ca marche et a propos de l'EGFR.

La page demo est le coeur utile. On y saisit une molecule au format SMILES ou on choisit un exemple, et le site affiche si elle est active sur l'EGFR, sa puissance estimee en pIC50, ses proprietes chimiques et les molecules connues qui lui ressemblent.

La page espace chimique affiche la carte interactive des molecules, colorees par activite, ou l'on peut survoler chaque point.

## Architecture technique

Le site est bati avec Next.js 14 en App Router et TypeScript. Le style utilise Tailwind CSS, les animations d'interface Framer Motion, et la molecule 3D est faite avec Three.js via React Three Fiber. Les polices sont Exo pour les titres et Roboto Mono pour les donnees chimiques, un choix adapte a l'univers scientifique.

La 3D est chargee en lazy loading cote client uniquement, pour ne pas bloquer l'affichage initial. Le site respecte prefers-reduced-motion, il est responsive du mobile au grand ecran, et le contraste des textes est controle.

## Le choix retenu pour les predictions

Le site fonctionne de facon totalement autonome, sans backend Python. Les predictions sont calculees par des routes API Next.js qui appliquent des regles chimiques simples a partir du SMILES. Toute cette logique est isolee dans le fichier lib/chemistry.ts.

Ce choix a ete fait pour que la demonstration soit fiable et facile a lancer devant un jury, sans dependre d'un serveur Python qui pourrait ne pas demarrer. Les valeurs affichees sont realistes et deterministes, la meme molecule donne toujours le meme resultat.

## Brancher les vrais modeles scikit-learn

Pour connecter les vrais modeles entraines dans les notebooks du POC, il suffit de remplacer le contenu des routes API. Le point d'entree est le fichier app/api/predict/route.ts. Au lieu d'appeler la fonction predire de lib/chemistry.ts, on ferait un appel fetch vers un petit backend FastAPI qui charge les fichiers joblib et renvoie les vraies predictions.

Concretement, le backend FastAPI exposerait un endpoint qui recoit un SMILES, calcule les descripteurs avec RDKit, applique le modele de classification et le modele de regression, et renvoie le meme format JSON que celui attendu par le site. Comme le contrat de donnees est deja defini par l'interface Prediction dans lib/chemistry.ts, le reste du site continuerait de fonctionner sans modification.

## Structure du projet

Le dossier app contient les pages et les routes API. Le dossier components contient les composants d'interface, avec un sous-dossier sections pour les blocs de la page d'accueil et un sous-dossier ui pour les composants de base reutilisables. Le dossier lib contient la logique chimique et les donnees de reference.

## Limite

Ce site est une preuve de concept academique. Les predictions de la version autonome sont des approximations a but de demonstration. Pour un usage reel, il faut brancher les vrais modeles comme explique plus haut. L'outil accelere la preselection de molecules mais ne remplace jamais la validation en laboratoire.

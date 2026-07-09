# Nucleus, le site de AI for Molecular Design

Site web Next.js qui sert de vitrine et d'outil d'utilisation au POC de decouverte de medicaments contre l'EGFR. Theme laboratoire du futur, molecule 3D interactive, glassmorphism, animations soignees.

## Lancer le site

```
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

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

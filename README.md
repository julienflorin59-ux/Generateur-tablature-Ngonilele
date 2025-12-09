# Ngonilélé Tab Generator

Application web pour générer, éditer et visualiser des tablatures pour le Ngonilélé.

## État du projet

**Note importante :** Si vous rencontrez des erreurs lors de l'envoi vers GitHub, assurez-vous que le fichier `.gitignore` est bien présent pour exclure le dossier `node_modules`.

## Fonctionnalités

- Éditeur de tablature interactif
- Visualisation graphique sur le manche
- Lecture audio (Synthèse & Samples)
- Export PDF, Audio (MP3) et Vidéo (WebM)
- Gestion de gammes et accordages personnalisés

## Installation

```bash
npm install
npm run dev
```

## Structure

- `src/` : Code source React
- `public/` : Assets statiques (images, sons)
- `vite.config.ts` : Configuration du bundler
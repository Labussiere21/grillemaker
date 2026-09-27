# GrilleMaker (web)

Générateur de grilles d'accords dans le navigateur : sections, reprises, cases 1./2., « même mesure », structure du morceau et export PDF portrait ou paysage.

Site 100 % statique : pas de serveur, pas de compte, rien n'est envoyé nulle part. Le morceau en cours est sauvegardé automatiquement dans le navigateur.

## Mettre en ligne (GitHub Pages)

1. Crée un repo sur GitHub (ex. `grillemaker`) et pousse ce dossier :
   ```bash
   git init
   git add .
   git commit -m "GrilleMaker web"
   git branch -M main
   git remote add origin https://github.com/<ton-pseudo>/grillemaker.git
   git push -u origin main
   ```
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Le workflow `.github/workflows/pages.yml` publie le site à chaque `git push` sur `main`.
   Adresse : `https://<ton-pseudo>.github.io/grillemaker/`

## Tester en local

Double-clic sur `index.html` suffit. Ou, pour un comportement identique au site :
```bash
python -m http.server 8000
```
puis http://localhost:8000

## Utilisation

**Grilles**
- Ajoute une section (Intro, Couplet, Refrain, Pont, Solo, Outro…), règle cellules par ligne et nombre de lignes.
- Deux accords dans une mesure : `C Bb` ou `C, Bb` → diagonale dans le PDF. `C/E` reste un renversement.
- Case sélectionnée : début / fin de reprise, **Répéter ×** (×8…), cases **1.** / **2.**, `%` même mesure.
- Petite ligne sous l'accord : indication (rythme, « syncopé »…).
- Mesures calculées automatiquement (reprises et cases 1./2. comprises), ou forcées à la main.
- `Entrée` / `Tab` : case suivante. Les cases vides en fin de ligne ne sont pas imprimées.

**Structure**
- Générateur : nombre d'intros, couplets, refrains, solos… → numérotation automatique, chaque partie reliée à sa grille.
- Clique une partie pour la renommer (« Refrain de fin »), changer la grille jouée, forcer les mesures, ajouter une note ou la déplacer.

**Fichiers**
- *Enregistrer en .grille* télécharge le morceau (JSON) ; *Ouvrir un .grille* ou glisser-déposer pour le recharger.
- Format compatible avec la version bureau de GrilleMaker.

## Structure du repo

```
index.html            page unique
css/style.css         styles
js/model.js           données, calcul des mesures, générateur de structure
js/pdf.js             rendu PDF (jsPDF)
js/app.js             interface
js/example.js         exemple Sultans of Swing intégré
examples/             exemples .grille
vendor/jspdf.umd.min.js   jsPDF 2.5.2 (MIT), embarqué pour fonctionner hors ligne
```

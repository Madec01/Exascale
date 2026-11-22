# EXASCALE

**Architectures de l’émergence.** Un jeu incrémental de réseaux, de calcul et de conscience, écrit en JavaScript natif et Canvas 2D. D’un PC de 10 Hz à un réseau planétaire, chaque progression vient des données que vous acheminez réellement.

Version 1.0.0 · Interface française · Hébergement statique · Aucun compte, serveur applicatif, service distant ou dépendance chargée en jeu.

## Démarrer

Décompressez l’archive. Depuis le dossier contenant `index.html` :

```sh
python3 -m http.server 8080
```

Ouvrez `http://localhost:8080/` dans un navigateur moderne. Il s’agit uniquement d’un serveur de fichiers local : toute la simulation s’exécute dans le navigateur. L’ouverture directe en `file://` est déconseillée, car les imports ES modules y sont bloqués par la plupart des navigateurs.

Le premier circuit contient un générateur relié à son modem, un laboratoire déconnecté et 90 crédits de réserve. L’introduction se ferme avec **Prendre les commandes**.

## Publier sur GitHub Pages

1. Créez le futur dépôt GitHub puis placez **le contenu du dossier EXASCALE à sa racine**, avec `index.html`, `styles.css`, `src/`, `assets/` et `.nojekyll`.
2. Poussez ces fichiers sur la branche `main`.
3. Dans les réglages du dépôt, ouvrez **Settings → Pages → Build and deployment**.
4. Choisissez **Deploy from a branch**, branche **main**, dossier **/(root)**, puis **Save**.
5. Ouvrez l’adresse publiée par GitHub une fois le déploiement terminé.

Aucun `npm install`, bundler ou compilation n’est nécessaire. Tous les chemins du jeu sont relatifs : il fonctionne aussi sous le sous-chemin d’un dépôt. Le nom du dépôt peut donc être choisi librement.

Référence : [documentation GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Les premières minutes

- Inspectez le générateur : le CPU produit plus de données que le câble série de 100 o/s ne peut en vendre. Le buffer et la couleur du câble rendent cette contrainte visible.
- Touchez le câble, choisissez **Retirer**, puis reliez la sortie du générateur à l’entrée du laboratoire. À l’ère 1, une sortie ne peut avoir qu’une destination.
- Consacrez des données à **Contrôle de parité**, **Compression Huffman** et **Overclocking basique**. La recherche vient exclusivement des données traitées par un laboratoire.
- Construisez un correcteur et un compresseur. Réorganisez la chaîne, puis rétablissez la vente. Le correcteur augmente la valeur, le compresseur réduit la taille ; leurs cycles CPU se partagent avec le générateur.
- Touchez la carte **Prochaine évolution** pour améliorer le matériel et consulter les objectifs. Le passage d’ère est volontaire ; les seuils de ressources ne sont pas débités lors de la transition. Les crédits sont abandonnés au passage à l’ère 9, où les achats utilisent la néguentropie.

## Commandes

| Action                    | Tactile                                                            | Souris / clavier                  |
| ------------------------- | ------------------------------------------------------------------ | --------------------------------- |
| Inspecter                 | Toucher un module ou câble                                         | Cliquer                           |
| Connecter                 | Toucher la sortie droite, puis l’entrée gauche ; ou tirer le câble | Même méthode                      |
| Annuler un câble en cours | Croix de l’indication de connexion                                 | Échap                             |
| Retirer un câble          | Appui prolongé, ou bouton de l’inspecteur                          | Inspecteur / appui prolongé       |
| Déplacer un module        | Glisser le boîtier                                                 | Glisser                           |
| Déplacer la caméra        | Glisser le fond à un doigt                                         | Glisser le fond                   |
| Zoomer                    | Pincer à deux doigts ; bouton +                                    | Molette ; boutons + / −           |
| Centrer un module         | Double-toucher                                                     | Double-clic                       |
| Voir tout le réseau       | Bouton de cadrage                                                  | F                                 |
| Construire / rechercher   | Navigation inférieure                                              | B / R                             |
| Pause                     | Bouton Ⅱ du bandeau                                                | Espace hors des champs et boutons |
| Paramètres                | Bouton des réglages ; également depuis le guide                    | Même méthode                      |

Les cibles de ports conservent une surface de 44 × 44 pixels écran, même en dézoomant. Les panneaux mobiles occupent au maximum les 40 % inférieurs de la grille ; ils se parcourent par défilement. La grille elle-même reste sans défilement navigateur et prend en charge les encoches avec `safe-area-inset-*` et `100dvh`.

## Les neuf ères

| Ère                     | Nouvelle contrainte                                | Objectif principal                                      |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------- |
| 1 — Poste isolé         | CPU global, câble 100 o/s, 500 o de RAM            | 500 crédits                                             |
| 2 — Réseau local        | Routage pondéré, archives et reconstruction        | 15 000 crédits + 500 RP                                 |
| 3 — Salle serveur       | 15 % de corruption, quarantaines de 10 s           | 500 000 crédits                                         |
| 4 — Datacenter          | Énergie, refroidissement, bridage au-delà de 65 °C | 25 M crédits + 10 Go archivés                           |
| 5 — Big Data            | Ratio 4 agrégateurs / GPU, VRAM, stock ou vente    | 1 Md crédits + 10 Md paramètres                         |
| 6 — IA spécialisée      | Modèles en 30 s, inférence +40 kW / module         | 25 modules IA actifs sous 70 °C, pendant 10 s           |
| 7 — Agents et synthèse  | Pureté réelle/synthétique, Model Collapse          | 100 To/s, pureté ≥25 %, 300 s, 100 Md crédits           |
| 8 — Réseau planétaire   | Europe, Amérique, Asie, orbite et prédiction       | 1 000 concepts/s, synchronisation >98 %, noyau alimenté |
| 9 — Conscience générale | Plasticité, ancrage, néguentropie                  | Cohérence >90 % et recherche Distillation cosmique      |

Le jeu comprend 30 types de modules, 36 technologies en quatre branches, trois recettes expérimentales et les modèles fondateurs. Après un prestige, une Mémoire fondatrice devient disponible dès le premier poste. Les nouvelles ères conservent votre circuit : vous pouvez réutiliser ses traitements ou démonter les anciennes pièces avec remboursement partiel.

Le [GDD livré](./gdd_evolution_ia.md) contient le document complet et les conventions chiffrées retenues après audit. Le jeu simule des lots pondérés de données pour représenter des débits exascale sans créer un objet par octet.

## Diagnostiquer un circuit

- **ACTIF / ATTENTE / SATURÉ / CHAUD / QUARANTAINE / BLACKOUT** indiquent la raison du fonctionnement ou de l’arrêt.
- Les débits, capacités, buffers, priorités CPU/GPU, corruption, pureté, température et bridage sont visibles dans l’inspecteur.
- Une liaison cyan reste sous 70 % de charge ; ambre, elle approche de la limite ; rouge, elle est saturée. Les objets animés suivent la courbe du câble dans le sens réel du flux. Ils représentent un échantillon du débit, jamais un objet par octet.
- À partir de l’ère 4, les calques **Énergie** et **Fluides** permettent de relier les distributeurs et les chillers. Une boucle de refroidissement ne refroidit que les modules raccordés.
- Les poids se règlent en sélectionnant chaque câble d’un routeur : 3 et 1 correspondent à un partage 75/25.
- Les GPU proposent un choix entre stockage des paramètres et sortie vers la vente. Les modèles spécialisés se forgent dans les nœuds d’entraînement ; leur injection se fait dans l’inspecteur d’un ancien module.
- En fin de partie, les commandes de plasticité et d’ancrage se trouvent dans le panneau **Évolution** et suivent les recherches correspondantes.

## Sauvegarde, export et absence

La sauvegarde utilise `localStorage`, avec une copie de secours validée. Elle a lieu toutes les 30 secondes, lors de la sortie de l’onglet et de certaines actions majeures. **Paramètres → Exporter JSON / Importer JSON** permet de déplacer une partie entre appareils. L’import est entièrement validé avant confirmation et remplacement du circuit. Les ressources numériques, identifiants, files de paquets et limites du graphe sont contrôlés.

Le mode privé ou un quota épuisé peuvent rendre le stockage local indisponible : le jeu propose alors l’export. Un autre navigateur, une autre adresse ou l’effacement des données du site ne partagent pas la sauvegarde.

L’absence n’invente pas de stabilité parfaite :

- Jusqu’à 120 secondes, le moteur rejoue exactement le circuit par pas de 0,25 s.
- Un réseau sûr et stable des ères 1 à 5 peut prolonger ses gains jusqu’à 2 heures à 90 % du rendement mesuré.
- Pour les réseaux avancés, chauds, contaminés ou en blackout, seules les 120 secondes effectivement simulées sont retenues. Les compteurs de stabilité ne reçoivent pas une extrapolation de cinq minutes.
- Une partie sauvegardée en pause ne progresse pas hors ligne.

## Audio et identité

L’identité visuelle est dessinée spécifiquement dans `renderer.js` : substrat silicium, boîtiers chanfreinés, glyphes techniques, jauges et marque EXASCALE. Aucune police ni bibliothèque n’est téléchargée au lancement.

Le premier geste déverrouille Web Audio. Une nappe ambient procédurale accompagne les bruitages Kenney CC0 ; une synthèse de secours prend le relais en cas d’échec du chargement ou du décodage. Musique, SFX, sourdine globale et vibrations sont réglables. Les crédits et licences des fichiers tiers se trouvent dans [assets/LICENSES.md](./assets/LICENSES.md).

## Sandbox de vérification

- Ordinateur : **Ctrl + Shift + D**.
- Téléphone : ouvrir les paramètres et toucher trois fois rapidement le numéro de version en bas du panneau.

Le panneau permet ×1, ×5, ×20, un saut aux ères 1–9, l’injection de ressources et le déblocage des recherches de l’ère. Ces actions modifient la partie courante ; exportez une copie avant de tester. Le passage de niveau en sandbox n’est pas utilisé pour la preuve de progression économique.

## Architecture

| Fichier           | Responsabilité                                                           |
| ----------------- | ------------------------------------------------------------------------ |
| `index.html`      | Structure sémantique et commandes accessibles                            |
| `styles.css`      | Portrait/paysage, HUD, tiroirs, zones sûres                              |
| `src/data.js`     | Catalogue des ères, modules, technologies et unités                      |
| `src/engine.js`   | Simulation déterministe sans DOM, files de lots et règles de progression |
| `src/renderer.js` | Canvas, caméra, pointeurs, câbles, particules et culling                 |
| `src/main.js`     | Liaison de l’interface au moteur, boucle fixe et événements              |
| `src/audio.js`    | Assets et synthèse Web Audio avec reprise sur geste                      |
| `src/storage.js`  | Validation JSON, sauvegarde de secours, calcul hors ligne                |
| `tests/`          | Tests mécaniques, sauvegarde, gestes et protocole navigateur             |
| `audits/`         | Rapports indépendants des trois rôles d’audit                            |

Simulation à pas fixe de 0,1 s en ligne, rendu `requestAnimationFrame` séparé, métriques DOM rafraîchies à 4 Hz. Le DPR est plafonné, le nombre de particules limité à 900 et les historiques, files, caches et journaux sont bornés. Le rendu évite les objets hors champ et propose un mode économie d’énergie.

## Tests et limites de vérification

```sh
node --test tests/*.test.mjs
```

**Résultat final : 51 tests réussis**, dont une campagne complète 1→9→prestige sans ressources injectées (3 733 secondes simulées). Les tests mécaniques n’ont pas besoin de paquet tiers. Le test Canvas natif peut utiliser `@napi-rs/canvas` lorsqu’il est disponible ; le protocole navigateur nécessite Playwright/Chromium. Les modalités et résultats exacts figurent dans [BUGS_AND_AUDITS.md](./BUGS_AND_AUDITS.md).

**Limite de la livraison :** Chromium n’a pas pu démarrer dans l’environnement de fabrication et le navigateur distant ne pouvait pas atteindre le serveur local. Le rendu Canvas, les gestes synthétiques et les simulations ont été testés, mais la mise en page CSS et les performances sur de vrais Android/iOS restent à confirmer dans un navigateur. L’objectif de 60 FPS n’est donc pas présenté comme une garantie matérielle mesurée.

Cette version ne contient pas de service worker ni de synchronisation cloud. Les quatre zones sont des territoires logiques du graphe ; la grille fractale est représentée dans un espace borné avec auto-câblage. Les idées d’extension sont regroupées dans [IDEAS_BACKLOG.md](./IDEAS_BACKLOG.md).

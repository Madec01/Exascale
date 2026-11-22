# Audit QA & performance — EXASCALE

## Jalon 1 — Persistance, son et assets (21 novembre 2026)

Commande exécutée : `node --test tests/storage.test.mjs` — **10 tests réussis**.

Vérifications automatisées : aller-retour complet JSON, restauration de la sauvegarde précédente si principale corrompue, quota localStorage et stockage indisponible, JSON invalide, version inconnue, valeurs non finies/négatives, propriété de pollution de prototype, identifiants dupliqués, câble orphelin, type inconnu, fichiers trop gros et profondeur excessive. La sauvegarde est validée avant remplacement ; un échec ne remplace pas la sauvegarde existante. Formats importés : enveloppe EXASCALE schema1 ou état brut version1.x.

Progression hors ligne : maximum 2 h. Rejeu exact des 120 premières secondes par pas de 0,25 s. Ensuite, seulement aux étapes 1–5 et sur réseau sans chaleur >60 °C, quarantaine, blackout ou pureté <25 %, extrapolation conservatrice à 90 % du débit de la dernière fenêtre de 30 s. Aux étapes 6–9, seuls les 120 s réellement simulés sont accordés : aucun objectif temporisé ou état de topologie n'est fabriqué. La fonction retourne le temps effectivement accordé et signale la réduction. Tests des absences courtes, date future, plafonnement et situations dangereuses réussis. Limite assumée : l'extrapolation de ressources d'un réseau sûr reste une approximation, pas une simulation de chaque paquet pendant 2 h.

Audio : aucune création de contexte avant geste utilisateur ; sans Web Audio le jeu continue. 24 voix maximum, nettoyage `onended`, oscillateurs de nappe réutilisés et suspendus en onglet caché, méthode `destroy` retire ses écouteurs et coupe les sources. Sons locaux OGG avec synthèse de secours, aucune dépendance réseau runtime. Déclarations CC0 vérifiées sur pages auteur Kenney et dans les licences originales des deux archives effectivement téléchargées. Aucun logo Kenney utilisé.

## Jalon 2 — Intégration, import et performance (21 novembre 2026)

**14 tests de stockage/audio réussis** après durcissement supplémentaire : les buffers `input` / `output` sont des listes de 96 lots maximum avec champs sémantiques typés ; les paquets invalides, compteurs d'identifiants en collision, niveaux hors limites, statistiques/historique/journal mal formés sont refusés avant création du moteur. Tests de réimport puis tick du moteur réel dans chacune des neuf ères. Le temps de simulation est borné pour ne pas dépasser les dates gérables par le HUD. La pause sauvegardée reste effective hors ligne, sans création de ressources. Une garde supplémentaire interdit l’extrapolation si aucune source réelle n’est présente ou si un buffer diminue pendant la fenêtre de référence : une réserve finie ne devient pas une source perpétuelle. Test dédié réussi.

`tests/dom-smoke.mjs` exécuté avec **360×800, 430×932, 932×430 et 1440×1000** comme dimensions d'entrée du programme. Vérifie démarrage, onboarding, construction, recherche achetée grâce à des flux réellement simulés, réglage CPU dans l'inspecteur, contenu de tous les panneaux, triple-tap sandbox, affichage des neuf ères, sauvegarde/restauration et nettoyage. Ces tests utilisent LinkeDOM et un Canvas natif avec géométrie simulée : ils valident l'intégration JavaScript et ses branches responsive, **pas le calcul de mise en page CSS par un navigateur**. Les dépendances sont uniquement celles des tests facultatifs.

Corrections issues de l'intégration signalées au responsable UI :

- Boutons de zoom mobile passés de 42 à 44 px.
- Mode « paramètres » du nœud d'entraînement aligné entre interface et moteur.
- Affichage des FPS : ne pas afficher un 60 Hz fixe depuis une propriété de diagnostic inexistante.
- Message de progression hors ligne aligné sur le temps effectivement simulé / accordé.

Benchmark `node --expose-gc tests/performance.mjs` : **256 modules, 128 câbles**, 1 000 ticks de 0,1 s ; médiane **0,52 ms**, p95 **1,00 ms**, différence de tas après GC **+66 696 octets**, file maximale 1 lot dans ce scénario continu et historique borné à 120 points. Rattrapage de 120 s : **321 ms** dans cet environnement. Il s'agit de temps de simulation Node, sans rendu ni navigateur, et non d'une mesure de FPS mobile. Le rattrapage reste synchrone et peut provoquer une courte pause sur de très grands réseaux ; les tableaux et le nombre de pas sont bornés.

## Vérifications navigateur bloquées — à reproduire avant publication

Le lancement du Chromium fourni échoue dans cet environnement avant toute page : `socket() failed: Operation not permitted` dans ProcessSingleton, y compris avec `--no-sandbox`, `--no-zygote` et `--single-process`. Aucun résultat de rendu CSS navigateur, de 60 FPS sur mobile réel, de pincement sur matériel, de décodage OGG Safari ou de consommation batterie n'est déclaré acquis.

Le banc **`tests/browser-audit.mjs`** est fourni : quatre viewports, débordement horizontal, cibles 44 px, grille visible à 60 % derrière la feuille mobile, panneaux, sauvegarde du moteur réel, erreurs de console, stress de 64 modules / 56 câbles / centaines de paquets, événements tactiles pan/pinch et destruction des caches. Sa tentative d'exécution s'arrête au lancement du navigateur. `tests/render-harness.html` constitue le scénario de charge isolé.

Pour le reproduire sur une machine autorisant Chromium :

```sh
npm install --no-save playwright
npx playwright install chromium
python3 -m http.server 8080
# Dans un autre terminal, depuis le même dossier :
node tests/browser-audit.mjs
```

Pour reproduire le smoke DOM facultatif : `npm install --no-save linkedom @napi-rs/canvas`, puis `node tests/dom-smoke.mjs 360 800`. Les tests du moteur et du stockage utilisent uniquement Node natif (`npm test`).

## Jalon 3 — Contrôle final après intégration

- **14/14 tests stockage/audio réussis** sur le moteur final.
- **4/4 exécutions du smoke DOM réussies** : 360×800, 430×932, 932×430, 1440×1000. À chaque exécution : construction, recherche alimentée par le circuit, curseur CPU, six panneaux, triple-tap sandbox, neuf ères, sauvegarde et nettoyage. Même limite de géométrie simulée que ci-dessus.
- Contrôle ciblé supplémentaire réussi : construction d'une Mémoire fondatrice après un seed, export/restauration, conservation du seed et de `paidCurrency`, coûts et remboursement en néguentropie à l'ère 9. Les **30 types du catalogue** ont été construits, exportés, validés, restaurés puis simulés. Le quota global de RAM à l'ère 1 a été vérifié pendant 100 s (maximum observé dans ce scénario : 250 o, inférieur à 500 o).
- Vérification syntaxique `node --check` réussie pour `main.js`, `storage.js` et `audio.js`.
- Dernier benchmark, même scénario 256 modules / 128 câbles / 1 000 ticks : médiane **0,56 ms**, p95 **1,16 ms**, tas après GC **+71 880 octets**, historique 120 points, file maximale 1 lot. Rattrapage exact de 120 s en **333 ms**. Ces chiffres ne décrivent toujours ni un navigateur ni un téléphone.

Aucune nouvelle fonctionnalité ajoutée pendant cette passe. Aucune nouvelle tentative de contournement des restrictions navigateur. La validation CSS réelle et les essais physiques Android/iOS demeurent à effectuer avec le banc fourni.

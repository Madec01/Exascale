# Audit UI / UX, tactile et rendu — EXASCALE

## Jalon A — Renderer autonome (2026-11-21)

### Implémenté et vérifié par lecture de code / analyse statique

- Géométrie des modules, symboles vectoriels et sérigraphie dessinés dans `renderer.js`, sans image d'interface ni template externe. Boîtiers à huit côtés, pistes de cuivre calibrées, substrat sombre `#090D14` et gravure de cellules.
- Grille 220 × 160 unités par emplacement, boîtiers 174 × 112. Mise à l'échelle physique via Canvas et DPR borné à 2 en qualité haute, 1,75 automatique, 1 faible.
- Ports : cible **44 × 44 pixels CSS**, indépendante du zoom, sélection du port le plus proche si deux cibles se chevauchent.
- Tap sortie → tap entrée, glisser sortie → entrée, glissement du fond, pincement centré entre deux doigts, double tap de centrage, déplacement de modules. Appui de 650 ms sur câble pour retrait. Annulation des gestes en cas de `pointercancel` ou perte de capture.
- Halo d'armement du port, flèche directionnelle, câble de prévisualisation et bannière de connexion. Câbles sélectionnables avec tolérance de 17 px.
- Couleur/épaisseur de câble dérivées de la charge réelle. Rouge à saturation, ambre à 70 %, vert-cyan au-dessous. Les paquets visuels ne sont émis que lorsque `edge.rate > 0`, puis continuent jusqu'au destinataire.
- Packets distinguent texte, archive, fragments, corruption, dataset, tenseurs/modèles, concepts, courant et fluide par couleur, taille, géométrie et vitesse.
- Jauges : utilisation, tampon, cycle, débit, état court, température après ère 4. Flash de quarantaine, ondes thermiques au-dessus de 65 °C.
- Préférence système `prefers-reduced-motion` honorée pour paquets et effets pulsés. Les débits et jauges restent consultables.
- Mémoire visuelle bornée : 900 paquets actifs au maximum, pool de 900 maximum, 16 éclats, 180 mesures de frame/draw. Les caches des câbles supprimés sont nettoyés ; écouteurs, timer et ResizeObserver retirés dans `destroy()`.
- Culling des modules et câbles hors viewport ; coordonnées et longueurs de Bézier mises en cache ; la mesure des longues courbes n'est recalculée que lorsqu'une extrémité se déplace.
- Méthode `setOcclusion({right,bottom})` : fit et centrage tiennent compte des panneaux. Les coordonnées de la caméra sont déplacées à leur ouverture sans saut de zoom.
- `node --check src/renderer.js` : succès.

### Corrections préventives

1. Le fit d'une disposition initiale horizontale sur écran de 360 px rendait les libellés trop petits. Recommandation intégration : empiler verticalement les trois modules de départ pour une nouvelle partie sur mobile, sans modifier une sauvegarde existante.
2. Allocation de tableaux répétée par paquet pour déterminer les limites d'une courbe : remplacée par une boîte englobante mise en cache.
3. Mesure d'un badge de câble avec police antérieure : ordre de mesure corrigé.

### Limite de ce jalon

Les 60 FPS et la lisibilité effective ne sont pas déclarés validés sur appareil physique. Les tests navigateur intégrés (viewports 360×800, 430×932, paysage) seront ajoutés après disponibilité de l'interface et du moteur.

## Jalon B — Intégration, interactions et corrections

### Résultats exécutés

`node --test tests/renderer.test.mjs` : **10 tests réussis**. Couverture : DPR maximal, hitboxes de 44 px, tap-to-connect, glissement d'un module, double-tap après déplacement de caméra par l'inspecteur, invariance du point focal du pincement, purge de câbles supprimés, absence de nouvelles émissions sur liaison inactive, pause des paquets, bornes mémoire/cleanup et rasterisation native aux quatre dimensions de grille.

La passe native utilise `@napi-rs/canvas` ; les tests gestuels utilisent des événements déterministes et un contexte graphique simulé. Les assertions ne sont donc pas une preuve d'interaction réussie sur un navigateur mobile physique. Le moteur Canvas natif a été alimenté avec le véritable état `Engine` de démarrage, puis inspecté visuellement en portrait et en paysage. La police monospace est enregistrée explicitement dans la vérification native, dont la résolution des polices génériques diffère d'un navigateur.

| Écran visé | Surface Canvas testée | Disposition initiale      | Zoom obtenu |
| ---------- | --------------------- | ------------------------- | ----------- |
| 360 × 800  | 360 × 602             | 3 modules verticaux       | 110,6 %     |
| 430 × 932  | 430 × 734             | 3 modules verticaux       | 115 %       |
| 932 × 430  | 850 × 319             | 3 modules horizontaux     | 109,9 %     |
| 1440 × 960 | 1338 × 790            | Réseau horizontal initial | 115 %       |

Les dimensions de Canvas correspondent aux espaces restants après le HUD, la navigation et la barre latérale prévus par CSS ; ce sont des tests de la surface graphique, **pas des captures du DOM intégré**.

### Problèmes trouvés et résolus

- **VIS-01 — Texte trop petit au démarrage portrait** : disposition verticale appliquée par l'intégration aux nouvelles parties mobiles, sans réordonner une sauvegarde. Paysage court : disposition sur une ligne ; marges verticales du fit abaissées.
- **VIS-02 — Coût du rendu dézoomé** : niveau de détail compact sous un zoom de 60 % ; libellé court, utilisation, buffer et ports conservés. Les détails restent disponibles par focus et dans l'inspecteur.
- **VIS-03 — Chevauchement de HUD** : les inscriptions HUD du Canvas sont désactivées par défaut, car l'interface DOM possède déjà titre, zoom, informations de grille et aide au câblage.
- **VIS-04 — Double-tap contrarié par l'inspecteur** : le deuxième tap reconnaît aussi la position écran du premier, afin de conserver sa cible après un déplacement de caméra.
- **VIS-05 — Faux succès lors d'un appui long** : le message indique désormais « Retrait du câble demandé » avant la boîte de confirmation.
- **VIS-06 — Animation pendant la pause** : `callbacks.isPaused()` bloque l'émission et le déplacement des paquets, tout en permettant de déplacer la caméra.
- **VIS-07 — Paquets superposés visuellement** : cadence d'émission bornée par leur vitesse et leur longueur pour ménager un espace réel entre paquets. La saturation reste visible sur le câble sous-jacent, sans devenir un ruban de paquets indiscernables.
- **VIS-08 — Nature des flux** : alias `tensor` violet et `thought` cyan ajoutés ; demande au moteur de faire remonter les flags compression/correction/certification dans `flowType`.
- **VIS-09 — Zoom sous le panneau** : zoom centré par défaut sur l'espace effectivement visible après occlusion.
- **VIS-10 — Boutons de zoom à 42 px** : anomalie CSS transmise au responsable UI, corrigée à 44 px.

### Mesure de rasterisation native (pas une mesure de FPS navigateur)

Scénario fixe : **100 modules visibles, 90 câbles, 310 paquets simultanés**, surface de 1440 × 760 pixels CSS, DPR 2, qualité haute. Sur le runtime disponible : **durée de `draw()` médiane 5,70 ms ; p95 6,90 ms**. Les anciens 890 paquets étaient visuellement superposés : la correction d'espacement réduit ce scénario à 310 paquets distincts. Le plafond technique reste de 900 particules actives (400 en qualité faible), avec pool borné.

Le temps entre images de 16,67 ms injecté dans le banc est **synthétique** et n'est pas comptabilisé comme une mesure de 60 FPS. Aucun taux de rafraîchissement physique n'est garanti à partir de ces chiffres.

### Vérification navigateur empêchée

Chromium/Playwright local n'a pas pu démarrer : création de socket du processus principal refusée (`Operation not permitted`). La route navigateur distante n'a pas permis d'ouvrir la page locale. Aucun contournement n'a été tenté. Le DOM intégré, Safari iOS, Chrome Android, le pincement natif, les safe areas et les performances sur appareil réel restent à valider sur un hôte autorisé. Les scripts de QA navigateur sont fournis séparément.

## Jalon C — Finition de la Conscience générale

- À l'ère 9, la trame planétaire est remplacée par un substrat synaptique **récursif à trois niveaux**, composé de cellules chanfreinées et de bifurcations auto-similaires. Les quatre labels géographiques restent spécifiques à l'ère 8.
- Bornage explicite : au plus 16 racines × 21 régions, soit **336 régions décoratives** avant élimination hors viewport. L'épaisseur des lignes reste inférieure à un pixel CSS ; la grille logique, les positions et les hitboxes ne sont pas modifiées.
- Icône `founder` originale ajoutée : mémoire centrale sertie dans un hexagone à six connexions, prête pour le nœud Mémoire fondatrice du prestige.
- Test complémentaire : absence de sous-trame à l'ère 8, présence à l'ère 9, limite de 336 régions aux zooms extrêmes, dessin du symbole fondateur sans exception. **11 tests renderer réussis** à la passe finale.

Mesure native après cette finition : même scénario de **100 modules, 90 câbles, 310 paquets**, avec **58 régions fractales visibles** ; `draw()` médiane **7,83 ms**, p95 **9,37 ms**. Ces chiffres remplacent la mesure de coût finale de rendu ; la mesure précédente reste conservée pour retracer l'itération. Ils restent des durées de rasterisation native et ne démontrent pas des FPS sur téléphone.

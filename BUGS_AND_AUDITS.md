# EXASCALE — Bugs et audits

Version 1.0.0 · Session du 21 novembre 2026.

## Périmètre et méthode

Trois agents spécialisés ont conçu et relu leurs systèmes, puis mené des passes d’intégration : **Économie & Gameplay**, **UI/UX, Tactile & Juice**, **QA & Performance**. Les rapports détaillés sont conservés dans `audits/economy.md`, `audits/visual.md` et `audits/qa.md`. Les corrections transverses ont ensuite été vérifiées ensemble.

Les résultats ci-dessous distinguent une preuve mécanique exécutée, une rasterisation Canvas native, un test DOM à géométrie simulée, et une validation dans un vrai navigateur. Ces niveaux ne sont pas interchangeables.

## Jalon A — Architecture et mécanique

| Contrôle                            | Résultat / correction                                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Neuf ères et catalogue de recherche | Catalogue central, 36 technologies, quatre branches ; tests de couverture                                                  |
| Recherche active                    | Aucun gain sans fichier reçu par le laboratoire ; branchement et débit testés                                              |
| Formules GDD                        | Bridage 65–100 °C, qualité `(P/0,20)²`, cohérence `1−abs(Φ−Ψ)/100` testés aux seuils                                       |
| Câbles et poids                     | Pas de duplication des flux ; partage 3:1 testé ; sorties ordinaires limitées à une liaison de données                     |
| Archives fragmentées                | Reconstruction impossible sans les quatre fractions ; budget de mémoire réservé par fraction pour prévenir un verrouillage |
| Cybersécurité                       | Quarantaine de 10 s, antivirus, certification et recette virale testés                                                     |
| GPU et entraînement                 | Dataset obligatoire, stock/vente exclusifs, modèles conditionnés à 10 Go et une durée de calcul                            |
| Électricité et refroidissement      | Blackout de 15 s, température et dissipation vérifiés ; alimentation supplémentaire réellement livrée aux destinataires    |
| Planétaire                          | Quatre zones requises, dérive des flux, prédicteurs et synchronisation pondérée par production                             |
| Prestige                            | Réinitialisation du circuit, conservation des modèles fondateurs et déblocage de la mémoire fondatrice                     |

## Jalon B — Erreurs identifiées et résolues

| ID      | Problème observé                                                                                                                            | Correction                                                                                                      |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| ECO-01  | La chaîne mono-câble du texte initial rendait le compresseur inutile pour les ventes : les liens amont étaient déjà limités à un document/s | Bus interne de PC à 500 o/s ; modem/laboratoire restent à 100 o/s ; calcul corrigé dans le GDD                  |
| ECO-02  | Les 500 o de RAM pouvaient être multipliés par les modules, ou monopolisés par une source orpheline avec un plafond global naïf             | Plafond global et quotas individuels au poste isolé ; test d’un générateur déconnecté et d’un laboratoire actif |
| ECO-03  | Une boucle de disques pouvait recompter les mêmes octets                                                                                    | Marquage des lots archivés et clé d’agrégation conservant ce marqueur                                           |
| ECO-04  | Une boucle synaptique pouvait produire plusieurs fois à partir des mêmes concepts                                                           | Marqueur de transformation cognitive conservé dans les lots                                                     |
| ECO-05  | Un petit bus parfaitement synchronisé pouvait masquer un gros bus désynchronisé                                                             | Agrégation pondérée de la synchronisation                                                                       |
| ECO-06  | Les connexions électriques pouvaient fournir de la capacité à des destinations non raccordées                                               | Débit électrique limité par la source, les poids et le besoin réel des destinataires                            |
| ECO-07  | Le curseur GPU n’avait pas d’effet sur une allocation proportionnelle aux besoins seuls                                                     | Allocation par priorité, plafond individuel et redistribution du surplus ; test 75:25                           |
| ECO-08  | La télémétrie additionnait parfois le même traitement en entrée et en sortie                                                                | Compteurs séparés ; utilisation CPU/GPU fondée sur le calcul effectivement utilisé                              |
| ECO-09  | Risque d’absence de ressource d’amorçage pour les technologies T9 payées en Nₑ                                                              | Noyau de réflexion capable de produire un premier Nₑ avant les synapses ; cadence plafonnée                     |
| UX-01   | Réseau initial horizontal illisible en portrait                                                                                             | Nouvelle partie verticale sur téléphone et en ligne sur paysage court ; sauvegardes existantes conservées       |
| UX-02   | HUD dessiné deux fois (Canvas et DOM)                                                                                                       | Inscriptions Canvas désactivées par défaut dans l’application                                                   |
| UX-03   | Inspecteur masquant le module sélectionné et déplaçant la cible du second tap                                                               | Occlusion prise en compte, focus différé et suivi du point du premier tap                                       |
| UX-04   | Hitboxes des boutons zoom mobiles de 42 px                                                                                                  | Minimum relevé à 44 px                                                                                          |
| UX-05   | Ruban de paquets superposés sur câbles chargés                                                                                              | Émission bornée par la vitesse et la longueur des paquets                                                       |
| UX-06   | Paquets animés pendant la pause                                                                                                             | Émission et déplacement figés, caméra toujours manipulable                                                      |
| UX-07   | « Câble retiré » annoncé avant confirmation                                                                                                 | Message de demande de retrait, confirmation puis mutation                                                       |
| UX-08   | 60 Hz affichés depuis une propriété inexistante                                                                                             | Taux calculé à partir des intervalles de frames réellement observés ; tiret avant mesure                        |
| UI-01   | Mode paramètres incohérent entre interface et simulation                                                                                    | API et choix de production harmonisés                                                                           |
| UI-02   | Contournement de la recherche cognitive par affectation directe depuis un curseur                                                           | Commandes passent par l’API qui contrôle les recherches ; curseurs désactivés si verrouillés                    |
| UI-03   | Bouton de construction ne se réactivant pas après accumulation de crédits                                                                   | Réévaluation des prix à 4 Hz sans recréer les champs manipulés                                                  |
| UI-04   | Mauvaise unité sur les réseaux énergie/fluides et mélange calcul/VRAM                                                                       | kW sur les liaisons techniques ; GPU utilisé/alloué exprimé en TFLOPS                                           |
| ECO-10  | Antivirus prédictif ramenant une petite fraction contaminée à zéro plutôt qu’à 0,1 %                                                        | Partage exact en fractions saine et contaminée, sans destruction d’octets ; test numérique ajouté               |
| SAVE-01 | JSON syntaxiquement valide mais queues mal formées pouvant arrêter le moteur                                                                | Validation des schémas de paquets, tableaux, bornes, dates et identifiants avant restauration                   |
| SAVE-02 | Réserve finie extrapolée comme une production perpétuelle                                                                                   | Source requise, buffers non décroissants et absence d’instabilité avant tout prolongement des gains             |
| SAVE-03 | Pause non respectée hors ligne                                                                                                              | Pause persistée et gain hors ligne nul dans cet état                                                            |
| SAVE-04 | Quota de stockage ou sauvegarde principale corrompue                                                                                        | Erreur gérée, copie de secours validée, export JSON disponible                                                  |

## Jalon C — Preuves de progression et d’intégration

**Résultat global final : 51 tests réussis, 0 échec** : 25 scénarios économiques, 1 campagne, 11 tests de rendu/gestes et 14 tests de stockage/audio. La campagne atteint le prestige à 3 733 secondes simulées (62 min 13 s).

- `tests/campaign.test.mjs` effectue **1→9→Distillation** avec les mêmes actions que le joueur : construction payée, câblage, collecte, recherche, amélioration et changement d’ère. Il n’appelle pas `setStage`, ne crée pas de paquets factices et n’injecte pas de ressources.
- Chaque ère fait également l’objet de scénarios mécaniques ciblés, indépendants du parcours optimisé.
- Les trois recettes sont vérifiées par les données et événements correspondants ; les marqueurs de découverte sont sauvegardés.
- Export, validation, restauration et simulation ont été exécutés sur les **30 types de modules** et les neuf ères.
- Les gestes synthétiques vérifient les cibles constantes, le câblage, le déplacement, le pinch, le double-tap, le nettoyage des caches et la pause.
- Le smoke DOM a été exécuté en **360×800, 430×932, 932×430 et 1440×1000** : introduction, construction, recherche issue de flux réels, priorité CPU, panneaux, sandbox, neuf ères, sauvegarde et destruction. Sa géométrie est simulée ; il ne prouve pas le rendu CSS.
- Inspection visuelle du véritable état initial du moteur rasterisé dans un Canvas natif, en portrait et paysage ; rendu du substrat fractal et icône de prestige également testés.

## Performance et mémoire mesurées

| Banc exécuté                       | Charge                                                             | Mesure                                          |
| ---------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------- |
| Simulation Node, dernier audit QA  | 256 modules, 128 câbles, 1 000 ticks                               | Médiane 0,56 ms ; p95 1,16 ms par tick de 0,1 s |
| Mémoire après GC, même banc        | Flux continus, historique 120 points                               | Variation de tas +71 880 octets ; files bornées |
| Rejeu hors ligne, même banc        | 120 s de simulation                                                | 333 ms de temps CPU observé                     |
| Rasterisation Canvas native, ère 9 | 100 modules, 90 câbles, 310 paquets, 58 régions fractales visibles | Médiane 7,83 ms ; p95 9,37 ms par dessin        |

Ces mesures décrivent le runtime de fabrication, pas un smartphone. Les objets visuels sont plafonnés à 900 (400 en qualité faible), l’historique à 120, les files à 96 lots et les journaux à 30 événements. Les caches suivent la suppression des câbles ; `destroy()` retire les écouteurs, observers, timers, voix et buffers audio. Un test borné de mémoire ne constitue pas une preuve absolue d’absence de fuite dans tous les navigateurs.

## Vérifications non acquises et limites connues

1. **Navigateur réel bloqué.** Chromium échoue avant le chargement (`socket() failed: Operation not permitted`). Le navigateur distant ne pouvait pas ouvrir l’URL locale. La mise en page CSS sur moteur de navigateur, les safe areas natives, le pinch matériel, la lecture OGG sur Safari et les **60 FPS sur téléphone réel ne sont pas certifiés**. `tests/browser-audit.mjs` permet de reprendre ces contrôles sur une machine autorisée.
2. **Progression hors ligne conservatrice.** Les deux premières minutes sont rejouées ; le prolongement à deux heures concerne uniquement les réseaux sûrs des ères 1–5 et applique 90 % de rendement. Les ères avancées ne reçoivent pas de stabilité extrapolée. Le rejeu synchrone peut provoquer une courte pause sur les grands réseaux.
3. **Représentation des ères avancées.** Les territoires sont des zones logiques du graphe et la latence une dérive sémantique ; ce n’est pas une simulation astrophysique en temps de vol de chaque paquet. La grille fractale utilise une surface bornée et un auto-câblage réel, pas un monde infini.
4. **Équilibrage humain.** Une campagne optimisée démontre l’accessibilité des seuils. Elle ne démontre pas qu’un joueur débutant adoptera la même stratégie ni que chaque durée ressentie est idéale ; des sessions humaines restent utiles.

## Reproduire

```sh
node --test tests/*.test.mjs
node --expose-gc tests/performance.mjs
```

Le smoke DOM et le banc navigateur facultatifs sont documentés dans `audits/qa.md`. Aucune de leurs dépendances ne fait partie du runtime du jeu.

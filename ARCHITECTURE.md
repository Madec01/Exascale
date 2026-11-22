# EXASCALE — Architecture technique

## Frontières

Le moteur ne dépend pas du navigateur. L’application est composée d’ES modules natifs, servis tels quels. Le rendu et l’audio lisent l’état de la simulation ; ils ne décident pas des ressources gagnées. L’interface déclenche les mêmes opérations que les scénarios de tests.

- `data.js` : `STAGES`, `NODE_TYPES`, `TECHS`, `BRANCHES`, `VERSION` et `format`.
- `engine.js` : classe `Engine`, règles économiques, mutations validées et état sérialisable.
- `renderer.js` : classe `Renderer`, projection Canvas et événements de pointeurs.
- `audio.js` : classe `AudioEngine`, contexte débloqué par geste, effets et nappe sonore.
- `storage.js` : sauvegarde, import strict, export et progression hors ligne.
- `main.js` : orchestration, navigation, panneaux, commandes et rafraîchissement DOM.

## Boucle et unités

Le client accumule le temps écoulé, puis appelle `Engine.tick(0.1)` autant que nécessaire dans une limite bornée par frame. `tick` subdivise également ses appels pour que le rejeu et les tests utilisent des pas compatibles. `Renderer.draw(timestamp)` travaille indépendamment à la cadence d’affichage. Le DOM se rafraîchit à 4 Hz, sans remplacer les curseurs et champs actifs.

Les unités internes sont les octets décimaux, les secondes, les Hz, les TFLOPS et les kW. Les fractions de charge, de pureté, de synchronisation et de cohérence vont de 0 à 1. Les paramètres Φ/Ψ vont de 0 à 100. Le formateur adapte les unités d’affichage sans modifier l’état.

## Graphe et lots

Les modules ont un identifiant stable, un type, une position entière, un niveau, une priorité, une zone, des files d’entrée/sortie et de la télémétrie. Les câbles référencent deux identifiants et un calque `data`, `power` ou `cooling`.

Un lot représente une quantité pondérée de données et conserve ses octets, sa valeur, ses unités, ses RP, sa part réelle, sa corruption, sa zone et ses transformations. Un transfert fractionnaire divise toutes ces quantités dans la même proportion. L’agrégation des lots repose sur une signature qui inclut leurs marqueurs de transformation, d’archivage et d’éveil, afin d’éviter les doubles gains sur les cycles.

La simulation suit la séquence : allocation des capacités et de l’énergie, production, traitement, transmission, calcul des métriques et objectifs. Les graphes cycliques sont permis ; les débits, budgets et buffers en limitent l’activité.

## API du moteur

Les opérations mutantes renvoient `{ok, message?}` ; construction et câblage renvoient aussi `node` ou `edge`.

- `addNode`, `removeNode`, `moveNode`, `connect`, `disconnect`.
- `available`, `researchStatus`, `buyTech`.
- `nodeCost`, `nodeUpgradeCost`, `hardwareCost`, `upgradeNode`, `upgradeHardware`.
- `setNodeMode`, `setNodeZone`, `injectModel`, `setCognition`.
- `goalProgress`, `advance`, `prestige`.
- `serialize`, `setStage` (sandbox explicite).

Le renderer communique uniquement par callbacks : sélection, connexion, déplacement, demande de suppression, notification et état de pause. Ses méthodes publiques comprennent `fit`, `focus`, `zoomBy`, `setLayer`, `setZone`, `setOcclusion`, `burst`, `getDiagnostics` et `destroy`.

## Bornes et persistance

Le graphe est limité à 1 024 modules et 4 096 câbles ; les files à 96 signatures ; l’historique à 120 mesures et le journal à 30 événements. Le rendu ajoute ses propres bornes : 900 paquets, pool réutilisable, effets et caches bornés. Les calques et le culling évitent de dessiner ce qui n’est pas visible.

Les sauvegardes utilisent l’enveloppe `{format:'EXASCALE', schema:1, exportedAt, state}`. Le parseur refuse un schéma futur non pris en charge, les identifiants incohérents, les nombres non finis, les valeurs hors limites, les propriétés de pollution de prototype et les objets trop profonds. L’import ne remplace l’état qu’après validation complète et confirmation de remplacement par l’utilisateur.

Le rattrapage hors ligne rejoue réellement un nombre borné de pas. Seuls les gains de réseaux précoces stables peuvent ensuite être prolongés prudemment. La stabilité chronométrée des ères avancées n’est pas extrapolée.

## Maintenance

Toute évolution de formule ou de coût doit mettre à jour le GDD, le changelog, les audits et un scénario pertinent. Toute nouvelle version de schéma de sauvegarde doit prévoir une migration explicite avant de pouvoir écraser un ancien fichier. Aucun service worker ne masque les versions des fichiers de cette livraison.

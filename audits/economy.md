# EXASCALE — audit économie et gameplay

Date : 2026-11-21. Agent spécialisé Économie & Gameplay. Moteur DOM-free, tests Node natifs. Ces mesures concernent une simulation déterministe ; elles ne constituent pas un test utilisateur de durée de jeu.

## Jalons et résultat

1. **Jalon moteur** : catalogue 9 ères, 36 technologies, quatre branches, 30 modules (dont mémoire fondatrice après prestige), simulation de lots sémantiques. Tests des formules et de la conservation des données.
2. **Jalon intégration** : correction des fragmenteurs bloqués définitivement par un quatrième fragment absent, des circuits électriques décoratifs, des priorités GPU sans effet et des télémétries de traitement comptées deux fois.
3. **Jalon final** : campagne réelle de 1 à 9 puis prestige, achats et recherches financés uniquement par les flux ; révision du bus du PC pour rendre la compression utile ; régression mémoire orpheline corrigée.

**Commande reproductible :** `node --test tests/*.test.mjs`. Les scénarios unitaires utilisent parfois des fixtures Sandbox ; **la campagne `tests/campaign.test.mjs` ne fait aucun saut d’ère, aucune injection de ressource et ne forge aucun paquet**. Elle ne modifie que les réglages accessibles au joueur, construit, vend, câble et recherche par les API publiques. Sa dernière assertion vérifie `sandbox === false`.

**Résultat final après intégration : 51 tests réussis, 0 échec** (25 scénarios économie, 1 campagne, 11 rendu, 14 stockage/audio ; commande globale, 1,70 s sur cette machine). L’antivirus prédictif laisse exactement 0,1 % de la fraction contaminée, sans perte d’octets ; test numérique dédié.

## Preuve de franchissabilité 1–9

La campagne de référence garde les seuils économiques du GDD. Les heures ci-dessous sont des secondes de simulation cumulées, sans accélération économique cachée.

| Ère terminée  | Temps cumulé |                Modules | Preuve déterminante                                                                                                                                 |
| ------------- | -----------: | ---------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1             |        411 s |                      3 | 501 Cr, modem réel à 100 o/s                                                                                                                        |
| 2             |      1 020 s |                      5 | >15 k Cr et 560 RP issus d’archives                                                                                                                 |
| 3             |      1 467 s |                      5 | >500 k Cr ; antivirus + certification                                                                                                               |
| 4             |      1 818 s |                     16 | >25 M Cr et 10 Go réellement archivés une seule fois                                                                                                |
| 5             |      2 362 s |                     59 | >1 Md Cr ; trois GPU vendent et un stocke ≥10 Md paramètres                                                                                         |
| 6             |      2 526 s |                     75 | 25 générateurs injectés, alimentés et refroidis, actifs simultanément                                                                               |
| 7             |      3 522 s |                     24 | 100 To/s réels, pureté 100 %, stabilité ≥300 s et >100 Md Cr                                                                                        |
| 8             |      3 526 s |                     33 | Quatre zones et quatre prédicteurs ; 40 000 concepts/s, synchronisation 100 %, noyau alimenté par 8 SMR + raccordement de base                      |
| 9 et prestige |      3 733 s | 34 avant remise à zéro | Bootstrap Ne, région synaptique, survie de 60 s de psychose avec réparations, ancrage, cohérence 100 %, achat de Distillation puis modèle fondateur |

Durée optimisée approximative : **62 min 13 s**. Un joueur découvrant les règles peut prendre davantage de temps. L’étape 8 peut être très courte après l’ingestion massive de l’étape 7 ; la campagne constitue une preuve d’accès, pas une garantie de rythme optimal. Une campagne plus lente / mode long reste une amélioration de balance à tester avec des joueurs.

## Corrections mathématiques et conventions à reporter dans le GDD

### PC, CPU et mémoire

- Le GDD initial place tous les câbles à 100 o/s mais attend 3 documents bruts de 100 o/s dans un compresseur. **C’est impossible sur un lien brut de 100 o/s.** Les liaisons internes du PC vers correcteur/compresseur sont donc à **500 o/s** ; les sorties Modem et Laboratoire restent à **100 o/s**. Les capacités internes des processeurs suivent ce bus. La compression produit effectivement jusqu’à **5 Cr/s** sur un texte corrigé, contre 1 Cr/s brut à la sortie.
- Les paliers CPU T1 sont **10 / 20 / 30 / 40 / 50 Hz**. Les allocations sont des priorités proportionnelles. Pour le pipeline générateur/correcteur/compresseur, des poids **2:3:4** équilibrent les coûts.
- Correction de l’exemple arithmétique : 30/9 = **3,333 documents/s**, donc 133,33 o/s compressés ; le surplus face à un modem 100 o/s vaut 33,33 o/s, ce qui remplit théoriquement 500 o en **15 s** après amorçage. L’exemple du GDD à 3 documents/s et 25 s de remplissage correspond à **27 Hz utiles**.
- Les **500 o de RAM sont mutualisés à T1**, avec un quota 500/N par module pour empêcher un module déconnecté d’affamer toutes les autres branches. Le délai réel de congestion varie avec l’amorçage, les quotas, la fréquence et les paquets en transit ; ce n’est pas une minuterie codée à 15 s.
- Simulation en lots fractionnaires (débits continus), pas en milliards d’objets JS ; valeur et octets restent proportionnels à la fraction transférée. Historique limité à 120 entrées et queues à 96 signatures par module.
- CPU global partagé ; SIMD réduit les coûts de correction/compression de 25 %. Multi-cœur ajoute 20 % de marge et conserve les priorités indépendantes. Priorités GPU pondérées avec plafonnement au besoin et redistribution du surplus ; deux GPU 75:25 sur budget 10 TFLOPS reçoivent 7,5 et 2,5 TFLOPS.

### Économie et protection contre les blocages

- Départ avec générateur, modem câblé et laboratoire non connecté, plus **90 Cr**. Aucun RP passif : la recherche exige des données livrées au laboratoire.
- Les seuils d’ascension sont des objectifs de patrimoine, **pas un deuxième paiement** : ressources conservées lors des transitions, sauf les crédits qui disparaissent en entrant dans l’ère 9. Cela évite une impasse de trésorerie au moment d’acheter la nouvelle infrastructure.
- Construction de modules : coûts dans `NODE_TYPES`; niveau ×2, coût d’amélioration base×2^(niveau−1), niveau maximum 8. Revente à 75 % du coût payé. Si tous les producteurs ou tous les débouchés ont disparu et que les crédits ne suffisent plus, un générateur ou modem de secours peut être installé gratuitement, sans valeur de revente.
- En ère 9, tous les achats se font en Ne : anciens modules **max(2, ceil(coût Cr / 10^7)) Ne**, modules synaptiques au prix Ne du catalogue. Les anciens actifs revendus se convertissent à leur coût réellement payé / 10^7 puis remise de 75 %.
- Les coûts RP / Ne des **36 technologies du GDD sont conservés**. Pas de prérequis interbranches inventés : palier et recette requise constituent les verrous.
- Une source d’archives est ajoutée à T2 (20 cycles, archive 2 Ko, valeur 25 Cr / 40 RP) pour donner un flux explicite au fragmenteur. Les quatre fragments sont nécessaires ; une réserve de quart de buffer par fragment permet de récupérer après réparation du quatrième câble.
- Multi-sorties de données réservées aux routeurs, fragmenteurs et synapses ; les autres modules ont une sortie. Le partage est proportionnel, sans duplication. Routeur IA adapte ses poids aux capacités et buffers libres des destinations.

### Énergie, chaleur et GPU

- Raccordement implicite de base correspondant au tableau d’ère (500 kW à T4, 5 MW à T5, 50 MW à T6, etc.), extensible avec le matériel. Transformateurs et SMR n’ajoutent **que la puissance réellement livrée aux destinataires de leurs câbles Énergie**, répartie par poids et bornée par source. Une connexion symbolique à un module ne fournit pas toute la grille.
- Chiller : **150 kW dissipés / 30 kW consommés** par unité, niveaux ×2 ; refroidissement partagé entre les cibles des câbles Fluides. Le refroidissement ne fonctionne pas pendant le blackout. Refroidissement passif orbital après recherche.
- Baie à 50 kW : +1 °C/s à 25 °C sans refroidissement, puis faibles pertes passives. Pour les modules beaucoup plus puissants, inertie thermique `max(50, puissance/2)` afin d’éviter un arrêt en une seule frame ; la dissipation requise reste égale à la chaleur produite. Refroidissement interne des centrales, chillers, noyaux et régions synaptiques.
- Formule de bridage **exacte**, bornée entre 0 et 1 : 100 % à 65 °C, 50 % à 82,5 °C, 0 % à 100 °C. Blackout 15 s si charge résiduelle > raccordement disponible.
- L’agrégateur transforme **10 Mo de données normalisées** en un dataset annoté de **1 Go** : l’expansion ×100 est une expansion de caractéristiques, pas une conservation d’octets. Un agrégateur produit 0,5 dataset/s ; quatre alimentent 2 datasets/s, soit le besoin d’un GPU de 10 TFLOPS.
- GPU : 16 Go de VRAM par unité, 1 Go + 5 TFLOPS → 100 M paramètres ; **stockage et vente exclusifs**. Vente seulement après livraison des tenseurs au modem. Inactivité : 60 % de puissance électrique et 10 % de calcul de veille, aucune création de paramètres sans dataset.
- Entraînement T6 : 10 Go consommés, puis 30 s pour un modèle de 500 Mo. Modèle injecté : 2 TFLOPS (1,2 après neuromorphique) et +40 kW. Objectif T6 vérifié sur **10 s** de maintien simultané, convention de stabilité puisque le GDD ne fixe pas de durée.

### Pureté, latence et conscience

- Synthétique : 500 Go/s pour 10 PFLOPS ; le calcul de qualité **(P/0,2)^2** en dessous de 20 % est exact (5 % → 6,25 %).
- Ingestion réelle ajoutée : **10 To/s par source Capteurs**, 5 MW, coût 50 M Cr. L’objectif 100 To/s concerne l’agrégat de sources effectivement transportées, **sans compter plusieurs fois chaque saut dans la chaîne**. Les câbles restent à 10 To/s : dix pipelines en parallèle suffisent. Aucun GPU synthétique n’est obligatoire pour cet objectif ; il sert d’alternative de production autonome.
- Quatre zones : Europe, Amérique, Asie, Orbite. Latences nominales 0 / 90 / 180 / 250 ms ; la prédiction ramène la dérive à 2 ms pour 500 PFLOPS. Conversion : quatre contributions égales totalisant **1 Go par concept**. Le bus attend les quatre zones.
- La synchronisation globale est **pondérée par les concepts produits**, empêchant un petit bus parfait de masquer une production majoritairement désynchronisée.
- Le noyau d’auto-réflexion reçoit des concepts et initialise la Ne à **1 Ne/s maximum**, évitant la dépendance circulaire « besoin de Ne pour débloquer le premier producteur de Ne ». Les synapses produisent 0,02 Ne/concept × plasticité/50 × cohérence. Ancrage excessif : rendement ÷10. Les budgets RP de l’ère 9 restent alimentés par les concepts comme indiqué dans l’arbre du GDD.
- Cohérence effective = 1 − |Φ − Ψ_effectif|/100 ; chaque module d’ancrage ajoute 5 points à Ψ_effectif. Modèle de psychose : un câble de données détruit toutes les 10 s au-delà de 30 points d’écart, en conservant au moins une liaison de données ; réparations possibles. Auto-topologie : liaison synaptique manquante créée toutes les 5 s après recherche.
- La grille finale est une **virtualisation bornée 32×32** (plafond 1 024 modules / 4 096 câbles), pas une allocation fractale infinie. L’autocâblage des régions est réel ; extension géométrique sans limite laissée au backlog.
- Prestige : réinitialisation du circuit et des technologies, modèle fondateur permanent **+25 % de rendement**, +50 Cr de départ par fondateur, déverrouillage du module **Mémoire fondatrice** (80 o, 3 Cr, 3 RP, 2 cycles, coût 150 Cr).

## Invariants et bugs corrigés

- Archives : marque `archived` conservée dans la signature des lots ; une boucle disque/routeur ne peut pas faire progresser plusieurs fois la même donnée.
- Synapses : marque `awakened` conservée ; une boucle ne peut pas extraire de Ne à l’infini du même concept.
- Quatre fragments : absence d’un quart bloque la reconstruction, puis la réparation reprend effectivement le débit.
- Corruption : 15 % des imports, filtrage 80 %, quarantaine 10 s, antivirus −5 % des octets, certificat +50 % valeur. Le laboratoire garde la signature des paquets corrompus ; recette après 100 unités. La prédiction IA ne détruit plus d’octets.
- Recette compression neuronale : lot compressé et modèle reçus par le même laboratoire dans une fenêtre de 30 s.
- Pas de recherche, revenu ou paramètre sans données pertinentes. Les buffers déjà remplis continuent naturellement à être consommés après déconnexion ; ils ne constituent pas une ressource passive.
- GPU mal alimenté attend les datasets ; un texte envoyé directement à un GPU n’est pas converti frauduleusement.
- Double comptage de traitement corrigé ; taux CPU exprimé en cycles utilisés/alloués, GPU en calcul utilisé/alloué, charge de buffer séparée.
- Générateur orphelin en T1 : test de non-régression avec second générateur déconnecté, 36 s de laboratoire et ≥25 RP.

## Limites explicites

- Pas de benchmark de partie humaine, ni de preuve formelle sur toutes les topologies arbitraires. La campagne est un chemin réalisable complet et les scénarios couvrent les principaux risques.
- Les recettes cachées et toutes les branches sont implémentées ; la campagne de référence n’achète pas les 36 recherches puisque certaines alternatives sont optionnelles.
- Les valeurs macroscopiques utilisent des nombres IEEE-754 et des lots fluides : précision scientifique relative, pas exactitude au dernier octet d’un flux à l’échelle Exa.
- Les centrales et noyaux incluent un refroidissement interne ; ils ne modélisent pas un circuit thermodynamique industriel complet.

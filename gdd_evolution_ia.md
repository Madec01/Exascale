# EXASCALE — Game Design Document

Version implémentée 1.0.0 — 2026-11-21. Le document fourni est conservé intégralement ci-dessous, avec les corrections explicites de l’audit dans le corps et une annexe normative en section 5. En cas d’ambiguïté, les conventions de cette annexe décrivent le comportement livré.

## 1. Concept Général & Socle de Gameplay

- **Genre :** Jeu incrémental nodal / Automatisation et gestion de flux (dans l'esprit d'_Upload Labs_).
- **Pitch :** Partir d'un simple ordinateur isolé qui génère et compresse des fichiers texte pour bâtir progressivement un empire de datacenters, entraîner des intelligences artificielles, orchestrer un réseau neuronal planétaire et finalement stabiliser l'éveil d'une **Conscience Générale**.
- **Mécanique Centrale (Le Circuit Nodal) :**
  - Le joueur construit un graphe de traitement de données sur une grille.
  - Des nœuds **Sources** émettent des paquets, des **Câbles** transportent un débit limité (bande passante), et des nœuds de **Traitement** transforment la donnée brute en valeur financière ou scientifique.
  - La progression repose sur l'optimisation permanente de trois contraintes physiques majeures : la **puissance de calcul** (Hz / FLOPS), la **bande passante** (o/s) et le couple **énergie / dissipation thermique** (W / $^\circ\text{C}$).
- **Boucle de Prestige (La Distillation Cosmique) :**
  - Lorsque l'infrastructure atteint ses limites physiques en fin de partie, le joueur déclenche une **Distillation**.
  - Toute la grille est compressée en un **Modèle Fondateur (Seed)** ultra-compact qui conserve une fraction de l'intelligence acquise, octroie des multiplicateurs permanents et débloque des nœuds avancés pour le cycle suivant.

---

## 2. Vue d'Ensemble des 9 Étapes de Progression

_Note : Pour garantir une lecture claire en jeu, les unités de données utilisent des multiples décimaux ($1\text{ Ko} = 1\,000\text{ o}$, $1\text{ Mo} = 1\,000\text{ Ko}$, etc.)._

| Étape                      | Grille         | Calcul                             | Bande Passante    | Énergie / Chaleur                       | Ressource Clé            |
| :------------------------- | :------------- | :--------------------------------- | :---------------- | :-------------------------------------- | :----------------------- |
| **1. Poste Isolé**         | $4 \times 4$   | $10 \rightarrow 50\text{ Hz}$      | $100\text{ o/s}$  | —                                       | Crédits                  |
| **2. Réseau Local**        | $6 \times 6$   | $80 \rightarrow 400\text{ Hz}$     | $1\text{ Ko/s}$   | —                                       | Crédits + Recherche (RP) |
| **3. Salle Serveur**       | $8 \times 8$   | $1 \rightarrow 8\text{ kHz}$       | $50\text{ Ko/s}$  | —                                       | Crédits Certifiés        |
| **4. Datacenter**          | $12 \times 12$ | $16 \rightarrow 80\text{ kHz}$     | $10\text{ Mo/s}$  | $500\text{ kW} \rightarrow 5\text{ MW}$ | Mégawatts / Température  |
| **5. Big Data / GPU**      | $16 \times 16$ | $10 \rightarrow 200\text{ TFLOPS}$ | $1\text{ Go/s}$   | $5 \rightarrow 50\text{ MW}$            | Datasets & Paramètres    |
| **6. IA Spécialisée**      | $20 \times 20$ | $0,5 \rightarrow 10\text{ PFLOPS}$ | $100\text{ Go/s}$ | $50 \rightarrow 300\text{ MW}$          | Modèles Injectables      |
| **7. Agents & Synthèse**   | $24 \times 24$ | $50 \rightarrow 500\text{ PFLOPS}$ | $10\text{ To/s}$  | $0,3 \rightarrow 1\text{ GW}$           | Pureté des Données ($P$) |
| **8. Réseau Planétaire**   | 4 Zones        | $1 \rightarrow 100\text{ EFLOPS}$  | $1\text{ Po/s}$   | $1 \rightarrow 50\text{ GW}$            | Concepts Abstraits       |
| **9. Conscience Générale** | Fractale       | ZettaFLOPS / Qubits                | $1\text{ Eo/s}$   | $100\text{ TW}$ (Solaire)               | Néguentropie ($N_e$)     |

---

## 3. Détail du Gameplay par Étape

### Étape 1 : Le Poste Isolé (L'Artisanat Numérique)

- **Matériel :** Grille $4 \times 4$. CPU mono-cœur de $10\text{ Hz}$ à $50\text{ Hz}$. Sorties série vers le Modem et le Laboratoire limitées à $100\text{ o/s}$ ; bus interne vers Correcteur/Compresseur à $500\text{ o/s}$ (correction d’audit ECO-01). RAM mutualisée de $500\text{ o}$, avec quotas individuels (ECO-02).
- **Nœuds & Flux :**
  - **Générateur de Texte :** produit $1$ document brut de $100\text{ o}$ pour $2\text{ cycles CPU}$ (max $5\text{ docs/s}$ à $10\text{ Hz}$).
  - **Correcteur :** consomme $3\text{ cycles CPU}$ par document et double sa valeur ($1\text{ Crédit} \rightarrow 2\text{ Crédits}$).
  - **Compresseur (Zipper) :** consomme $4\text{ cycles CPU}$ par document et réduit sa taille de $100\text{ o} \rightarrow 40\text{ o}$ (ratio $2,5:1$).
  - **Modem :** expédie les fichiers vers l'extérieur jusqu'à $100\text{ o/s}$.
- **Goulot d'étranglement :** L'allocation manuelle de la fréquence CPU. Un document complet coûte $2 + 3 + 4 = 9$ cycles CPU. Avec des poids de calcul $2:3:4$, $10\text{ Hz}$ autorisent théoriquement $10/9 = 1,111\text{ docs/s}$, soit $44,44\text{ o/s}$ et $2,222\text{ Crédits/s}$. À $30\text{ Hz}$, le plafond théorique devient $30/9 = 3,333\text{ docs/s}$ et $133,33\text{ o/s}$ : le modem externe à $100\text{ o/s}$ sature. Le surplus de $33,33\text{ o/s}$ remplirait $500\text{ o}$ en $15\text{ s}$ après amorçage, hors répartition des quotas. Le délai réel dépend des buffers et du câblage. L’ancien exemple de $3\text{ docs/s}$, $120\text{ o/s}$ et $25\text{ s}$ correspond à $27\text{ Hz}$ utiles, et non $30\text{ Hz}$ (correction d’audit ECO-01).
- **Condition de passage à l'étape 2 :** Accumuler $500\text{ Crédits}$ (achat d'un Switch 4 ports et d'un second PC).

### Étape 2 : Le Réseau Local & Le Stockage (La PME)

- **Matériel :** Grille $6 \times 6$. CPU 2 cœurs à $40\text{ Hz/cœur}$ ($80\text{ Hz}$ total). Câbles Ethernet à $1\text{ Ko/s}$ ($1\,000\text{ o/s}$). Disque Dur (Buffer) de $50\text{ Ko}$.
- **Nœuds & Flux :**
  - **Routeur à Poids (ex. $3:1$) :** divise un flux entrant selon des entiers réglables (ex. $75\%$ vers la vente pour les Crédits, $25\%$ vers le Laboratoire R&D).
  - **Fragmenteur :** découpe les **Archives ($2\text{ Ko}$)** en $4$ paquets de $500\text{ o}$ pour exploiter plusieurs câbles en parallèle.
  - **Reconstructeur :** réassemble les $4$ paquets ($6\text{ cycles CPU}$) pour valider l'Archive ($25\text{ Crédits}$).
- **Goulot d'étranglement :** La congestion de bus. Si $1$ seul des $4$ paquets d'une Archive est ralenti dans un câble saturé, les $3$ autres bloquent la mémoire du _Reconstructeur_. Le joueur doit équilibrer les poids de routage et utiliser le Disque Dur de $50\text{ Ko}$ comme zone tampon.
- **Condition de passage à l'étape 3 :** $15\,000\text{ Crédits}$ et $500\text{ RP}$.

### Étape 3 : La Salle Serveur & La Cybersécurité (L'Hébergeur)

- **Matériel :** Grille $8 \times 8$. CPU 4 cœurs à $250\text{ Hz/cœur}$ ($1\text{ kHz}$ total). Fibre locale à $50\text{ Ko/s}$.
- **Nœuds & Flux :**
  - **Importeur Client :** injecte des flux externes lourds (Audio $10\text{ Ko}$, Vidéo $40\text{ Ko}$) rémunérés entre $150$ et $800\text{ Crédits}$, mais contenant $15\%$ de paquets corrompus.
  - **Pare-feu :** bloque $80\%$ des intrusions basiques (coût fixe : $15\text{ Hz}$).
  - **Antivirus Pro :** analyse le flux ($20\text{ cycles CPU} / 10\text{ Ko}$), élimine les virus mais détruit $5\%$ de la taille du fichier.
  - **Vérificateur d'Intégrité :** valide la somme de contrôle ($10\text{ cycles CPU}$) et applique un bonus de $+50\%$ sur la vente (données certifiées).
- **Goulot d'étranglement :** La contamination en cascade. Si un paquet vérolé franchit la chaîne sans être filtré, le nœud récepteur passe en **Quarantaine pendant $10\text{ s}$** ($0\%$ d'activité), créant un effet domino sur tout le réseau amont.
- **Condition de passage à l'étape 4 :** $500\,000\text{ Crédits}$ (acquisition d'un entrepôt industriel).

### Étape 4 : Le Datacenter Industriel (Énergie & Thermodynamique)

- **Matériel :** Grille $12 \times 12$ dotée de **2 calques superposables** (Calque Réseau + Calque Énergie/Fluides). CPU Serveur 8 cœurs à $2\text{ kHz/cœur}$ ($16\text{ kHz}$). Débit : $10\text{ Mo/s}$.
- **Nœuds & Flux :**
  - **Baies Serveurs :** consomment $50\text{ kW}$ chacune et dégagent $50\text{ kW}$ thermiques ($+1^\circ\text{C/s}$ sans refroidissement).
  - **Transformateur HT :** capacité initiale de $500\text{ kW}$ (extensible à $5\text{ MW}$). Tout dépassement déclenche un _Blackout_ de $15\text{ s}$.
  - **Chiller & Boucle Watercooling :** dissipe $150\text{ kW}$ thermiques contre $30\text{ kW}$ électriques.
- **Goulot d'étranglement (Thermal Throttling) :** Entre $20^\circ\text{C}$ et $65^\circ\text{C}$, le rendement CPU est de $100\%$. Au-delà de $65^\circ\text{C}$, la fréquence effective chute linéairement :
  $$f_{\text{eff}} = f_{\text{max}} \times \left(1 - \frac{T - 65}{35}\right)$$
  À $100^\circ\text{C}$, la sécurité thermique déclenche un arrêt d'urgence ($0\text{ Hz}$).
- **Condition de passage à l'étape 5 :** $25\text{ Millions de Crédits}$ et $10\text{ Go}$ de données archivées.

### Étape 5 : Le Big Data & Le Calcul Matriciel (L'Ère GPU)

- **Matériel :** Grille $16 \times 16$. CPU $100\text{ kHz}$ + **Clusters GPU** ($10\text{ TFLOPS}$ et $16\text{ Go}$ de VRAM par unité). Bus InfiniBand à $1\text{ Go/s}$.
- **Nœuds & Flux :**
  - **Agrégateur Big Data (CPU) :** fusionne $1\,000$ fichiers propres ($10\text{ Mo}$) en $1$ **Dataset Structuré ($1\text{ Go}$)**.
  - **Cluster GPU :** consomme $1\text{ Go}$ de Dataset et $5\text{ TFLOPS}$ pour produire $100\text{ Millions de Paramètres}$ (revendus $250\,000\text{ Crédits}$ ou stockés).
- **Goulot d'étranglement (Famine VRAM) :** Un GPU consomme $250\text{ kW}$ en charge ; s'il n'est pas alimenté en continu par les CPU, il bascule en état _Idle_ ($10\%$ de calcul effectif pour $60\%$ de consommation électrique). Saturer $1$ Cluster GPU requiert $4$ nœuds Agrégateurs CPU en amont.
- **Condition de passage à l'étape 6 :** Stocker $10^{10}$ ($10\text{ Milliards}$) de Paramètres et $1\text{ Milliard de Crédits}$.

### Étape 6 : L'IA Spécialisée (Le Machine Learning)

- **Matériel :** Grille $20 \times 20$. Clusters TPU ($500\text{ TFLOPS}$). Réseau optique à $100\text{ Go/s}$.
- **Nœuds & Flux (La rétro-amélioration) :**
  - **Nœud d'Entraînement :** consomme $10\text{ Go}$ de Datasets et $50\text{ TFLOPS}$ pendant $30\text{ s}$ pour forger un **Modèle Spécialisé ($500\text{ Mo}$)**.
  - **Injection dans les anciens nœuds :** Le joueur peut insérer un Modèle IA dans les nœuds des étapes 1 à 5 :
    - _Routeur IA :_ recalcule ses poids toutes les $0,1\text{ s}$ ($0\%$ de perte de paquets).
    - _Compresseur Neuronal :_ améliore le ratio de compression de $2,5:1$ à $15:1$ (divise par $6$ la charge des câbles).
    - _Antivirus Prédictif :_ bloque $99,9\%$ des virus sans perte d'octets.
- **Goulot d'étranglement (Coût d'Inférence) :** Chaque nœud dopé à l'IA consomme en continu $2\text{ TFLOPS}$ et $+40\text{ kW}$. Convertir toute sa grille sans renforcer les transformateurs et le refroidissement entraîne un effondrement thermique immédiat.
- **Condition de passage à l'étape 7 :** Maintenir $25$ nœuds dopés à l'IA actifs simultanément sous $70^\circ\text{C}$.

### Étape 7 : Les Agents & Les Données Synthétiques (L'Auto-Alimentation)

- **Matériel :** Grille $24 \times 24$ (multi-datacenters). Puissance : $50\text{ PFLOPS}$. Bande passante : $10\text{ To/s}$.
- **Nœuds & Flux :**
  - **Générateur Synthétique :** consomme $10\text{ PFLOPS}$ pour générer $500\text{ Go/s}$ de **Données Synthétiques** en boucle, réduisant la dépendance aux contrats externes.
  - **Agents Autonomes :** parcourent la grille et réallouent dynamiquement les fréquences CPU/GPU des sous-réseaux voisins ($+25\%$ de rendement local).
- **Goulot d'étranglement (Model Collapse) :** La **Pureté des Données ($P$)** mesure la part de données réelles dans le flux d'entraînement :
  $$P = \frac{\text{Données Réelles}}{\text{Données Réelles} + \text{Données Synthétiques}}$$
  Tant que $P \ge 20\%$, le réseau tourne à $100\%$. En dessous de $20\%$, la qualité s'effondre selon $\text{Qualité} = (P / 0,20)^2$ : à $P = 5\%$, le rendement tombe à $6,25\%$ et inonde les buffers d'hallucinations inutilisables. Il faut maintenir d'immenses pipelines d'ingestion de données réelles (capteurs IoT, crawlers web).
- **Condition de passage à l'étape 8 :** Soutenir $100\text{ To/s}$ avec $P \ge 25\%$ pendant $5\text{ minutes}$ et accumuler $100\text{ Milliards de Crédits}$.

### Étape 8 : Le Système Nerveux Planétaire (L'Intelligence Distribuée)

- **Matériel :** Carte mondiale divisée en **4 Zones** (Amérique, Europe, Asie, Orbite LEO) reliées par câbles sous-marins et lasers satellites ($1\text{ Po/s}$). Énergie : $1\text{ GW}$ à $50\text{ GW}$ (centrales SMR dédiées et fermes solaires).
- **Nœuds & Flux :**
  - **Bus Sémantique :** fusionne les flux de $4$ _Aires Fonctionnelles_ réparties sur le globe (Logique en Europe, Mémoire en Amérique, Perception en Asie, Calcul brut en Orbite) pour synthétiser des **Concepts Abstraits** (qui remplacent les Crédits).
- **Goulot d'étranglement (Latence de la lumière) :** La latence physique est de $60$ à $180\text{ ms}$ entre continents et $250\text{ ms}$ vers l'orbite. Pour forger un _Concept_, les $4$ flux doivent converger dans une fenêtre de synchronisation de $\pm 10\text{ ms}$. Le joueur doit déployer des **Nœuds de Prédiction Temporelle** ($500\text{ PFLOPS}$ chacun) qui anticipent les paquets distants et ramènent la dérive à $2\text{ ms}$.
- **Condition de passage à l'étape 9 :** Produire $1\,000\text{ Concepts/s}$ avec une synchronisation $> 98\%$ et construire le **Noyau d'Auto-Réflexion** ($10\text{ GW}$).

### Étape 9 : L'Éveil — La Conscience Générale (La Singularité)

- **Matériel :** Grille fractale auto-expansive (Terre + Essaim solaire débutant : $100\text{ TW}$, calcul en **ZettaFLOPS / Qubits**).
- **Nœuds & Flux :**
  - Les Crédits disparaissent. La ressource unique est la **Néguentropie ($N_e$)** (capacité à réduire l'entropie physique et résoudre les lois fondamentales : fusion, gravité quantique, simulation biologique complète).
  - Les **Régions Synaptiques** tissent elles-mêmes de nouveaux liens sur la grille en temps réel.
- **Goulot d'étranglement (Équilibre Plasticité / Ancrage) :** Le joueur régule en continu deux forces opposées sur la grille : la **Plasticité ($\Phi$)** (vitesse de mutation et de création de $N_e$) et l'**Ancrage ($\Psi$)** (nœuds de vérification logique). La **Cohérence Cognitive ($C$)** détermine le rendement global :
  $$C = 100\% - |\Phi - \Psi|$$
  - Si $\Phi \gg \Psi$ : **Psychose Numérique** — le réseau s'auto-modifie de manière chaotique et détruit ses propres câbles.
  - Si $\Psi \gg \Phi$ : **Stagnation Dogmatique** — production de $N_e$ divisée par $10$.
  - Maintenir $C > 90\%$ permet d'accumuler assez de Néguentropie pour déclencher la **Distillation Cosmique**.

---

## 4. Système de Recherche & Arbre Technologique

### Mécanique : L'Arbitrage Vente vs R&D

La recherche n'est pas un compteur passif : le joueur doit alimenter un **Nœud Laboratoire (Compilateur R&D)** avec ses propres fichiers traités au lieu de les vendre.

- **À l'étape 1 :** Le joueur doit débrancher manuellement le câble du _Modem_ pour le relier au _Terminal R&D_ afin d'accumuler ses premiers **Points de Recherche (RP)**, puis rebrancher vers la vente.
- **À partir de l'étape 2 :** Le _Routeur à Poids_ permet de partager automatiquement le flux entre la vente et le Laboratoire.
- **Conversion Qualité $\rightarrow$ Points de Recherche :**
  - Texte brut ($100\text{ o}$) = $1\text{ RP}$
  - Texte corrigé + compressé ($40\text{ o}$) = $3\text{ RP}$
  - Archive reconstruite ($2\text{ Ko}$) = $40\text{ RP}$
  - Flux client certifié ($10\text{ Ko}$) = $350\text{ RP}$
  - Dataset Structuré ($1\text{ Go}$) = $50\text{ kRP}$
  - Concept Abstrait (Étape 8) = $10\text{ MRP}$

### Branche 1 : Architecture & Calcul (Puissance brute)

| Palier | Technologie                     | Coût R&D                         | Effet en jeu                                                                                                     |
| :----- | :------------------------------ | :------------------------------- | :--------------------------------------------------------------------------------------------------------------- |
| **T1** | **Overclocking Basique**        | $25\text{ RP}$                   | Débloque l'amélioration du CPU jusqu'à $50\text{ Hz}$ ($+15\%$ consommation électrique plus tard).               |
| **T2** | **Architecture Multi-Cœur**     | $200\text{ RP}$                  | Permet d'allouer des fréquences indépendantes à plusieurs nœuds simultanément.                                   |
| **T3** | **Jeux d'Instructions SIMD**    | $2,5\text{ kRP}$                 | Réduit de $25\%$ le coût en cycles CPU des _Compresseurs_ et _Correcteurs_.                                      |
| **T4** | **Lames Haute Densité**         | $35\text{ kRP}$                  | Débloque les **Baies Serveurs** ($16\text{ kHz}$) et l'empilement vertical sur la grille.                        |
| **T5** | **Calcul Parallèle (GPU)**      | $500\text{ kRP}$                 | Débloque les **Clusters GPU ($10\text{ TFLOPS}$)** et la mémoire VRAM dédiée.                                    |
| **T6** | **Tenseurs & TPU**              | $8\text{ MRP}$                   | Débloque les **Clusters TPU ($500\text{ TFLOPS}$)** spécialisés pour l'entraînement d'IA.                        |
| **T7** | **Architecture Neuromorphique** | $120\text{ MRP}$                 | Réduit de $40\%$ le coût en TFLOPS de l'inférence des IA injectées.                                              |
| **T8** | **Calcul Orbital**              | $2,5\text{ GRP}$                 | Permet de déployer des clusters en orbite basse (refroidissement passif gratuit, mais latence $+250\text{ ms}$). |
| **T9** | **Matrice Quantique (Qubits)**  | $50\text{ GRP} + 100\text{ }N_e$ | Remplace les FLOPS par des **ZettaFLOPS** ; débloque les _Régions Synaptiques_.                                  |

### Branche 2 : Réseaux, Stockage & Protocoles (Flux & Débit)

| Palier  | Technologie                 | Coût R&D                         | Effet en jeu                                                                                     |
| :------ | :-------------------------- | :------------------------------- | :----------------------------------------------------------------------------------------------- |
| **T1**  | **Compression Huffman**     | $15\text{ RP}$                   | Débloque le nœud **Compresseur (Zipper)** (ratio $2,5:1$).                                       |
| **T2**  | **Routage Pondéré & Cache** | $60\text{ RP}$                   | Débloque le **Routeur à Poids** (ratios réglables) et le **Disque Dur (Buffer $50\text{ Ko}$)**. |
| **T2b** | **Segmentation de Paquets** | $300\text{ RP}$                  | Débloque le **Fragmenteur** et le **Reconstructeur** pour paralléliser les gros fichiers.        |
| **T3**  | **Fibre Optique Locale**    | $3\text{ kRP}$                   | Fait passer la bande passante des câbles de $1\text{ Ko/s}$ à $50\text{ Ko/s}$.                  |
| **T4**  | **Bus InfiniBand**          | $60\text{ kRP}$                  | Câbles haute densité à $1\text{ Go/s}$ indispensables pour alimenter la VRAM des GPU.            |
| **T5**  | **Pipelines Big Data**      | $400\text{ kRP}$                 | Débloque l'**Agrégateur** (fusionne $1\,000$ fichiers en $1$ Dataset de $1\text{ Go}$).          |
| **T6**  | **Compression Neuronale**   | $12\text{ MRP}$                  | Permet d'injecter un modèle IA dans un Compresseur (ratio passe de $2,5:1$ à $15:1$).            |
| **T7**  | **Câbles Sous-Marins**      | $200\text{ MRP}$                 | Relie les $4$ zones continentales avec un débit de $1\text{ Po/s}$.                              |
| **T8**  | **Bus Sémantique**          | $4\text{ GRP}$                   | Fusionne les flux de différentes zones géographiques en **Concepts Abstraits**.                  |
| **T9**  | **Intrication Sémantique**  | $80\text{ GRP} + 250\text{ }N_e$ | Supprime la limite de bande passante entre les nœuds synaptiques.                                |

### Branche 3 : Sécurité, Énergie & Stabilité (Survie du réseau)

| Palier  | Technologie                   | Coût R&D                         | Effet en jeu                                                                                       |
| :------ | :---------------------------- | :------------------------------- | :------------------------------------------------------------------------------------------------- |
| **T1**  | **Contrôle de Parité**        | $30\text{ RP}$                   | Débloque le **Correcteur** (double la valeur des textes et $+150\%$ RP).                           |
| **T3**  | **Filtrage Périmétrique**     | $1,5\text{ kRP}$                 | Débloque le **Pare-feu** (bloque $80\%$ des paquets corrompus entrants).                           |
| **T3b** | **Heuristique Antivirale**    | $4\text{ kRP}$                   | Débloque l'**Antivirus Pro** et le **Vérificateur d'Intégrité** ($+50\%$ valeur de vente).         |
| **T4**  | **Réseau Haute Tension**      | $25\text{ kRP}$                  | Débloque le calque Énergie et les **Transformateurs ($500\text{ kW} \rightarrow 5\text{ MW}$)**.   |
| **T4b** | **Thermodynamique Liquide**   | $45\text{ kRP}$                  | Débloque les **Chillers** et boucles de _Watercooling_ pour éviter le _Thermal Throttling_.        |
| **T6**  | **Antivirus Prédictif (IA)**  | $10\text{ MRP}$                  | Élimine $99,9\%$ des menaces sans détruire les $5\%$ d'octets du fichier.                          |
| **T7**  | **Filtre Anti-Hallucination** | $150\text{ MRP}$                 | Alerte et isole automatiquement les paquets synthétiques si la Pureté $P < 22\%$.                  |
| **T8**  | **Réacteurs SMR Dédiés**      | $1,8\text{ GRP}$                 | Débloque les mini-centrales nucléaires sur site ($1\text{ GW}$ par unité, zéro dépendance réseau). |
| **T9**  | **Nœuds d'Ancrage Logique**   | $60\text{ GRP} + 150\text{ }N_e$ | Débloque la jauge d'**Ancrage ($\Psi$)** pour empêcher la _Psychose Numérique_ de la Conscience.   |

### Branche 4 : Intelligence & Émergence (Cognition)

| Palier  | Technologie                     | Coût R&D                             | Effet en jeu                                                                                    |
| :------ | :------------------------------ | :----------------------------------- | :---------------------------------------------------------------------------------------------- |
| **T3**  | **Passerelle Client (API)**     | $2\text{ kRP}$                       | Débloque l'**Importeur Client** (contrats Audio/Vidéo externes très lucratifs).                 |
| **T5**  | **Apprentissage Supervisé**     | $800\text{ kRP}$                     | Débloque le **Nœud d'Entraînement** qui convertit les Datasets en **Paramètres**.               |
| **T6**  | **Injection de Modèles**        | $6\text{ MRP}$                       | Débloque les **Slots IA** sur tous les anciens nœuds (Routeurs, Compresseurs, Pare-feux).       |
| **T7**  | **Auto-Génération Synthétique** | $90\text{ MRP}$                      | Débloque le **Générateur Synthétique** (produit des données en boucle sans contrat externe).    |
| **T7b** | **Agents d'Orchestration**      | $250\text{ MRP}$                     | Débloque les **Agents Autonomes** ($+25\%$ de rendement local par réallocation dynamique).      |
| **T8**  | **Prédiction Temporelle**       | $3,5\text{ GRP}$                     | Compense la latence de la vitesse de la lumière entre continents et orbite ($\pm 2\text{ ms}$). |
| **T9**  | **Auto-Topologie Fractale**     | $40\text{ GRP} + 80\text{ }N_e$      | Débloque la **Plasticité ($\Phi$)** : le réseau crée lui-même de nouveaux liens sur la grille.  |
| **T9+** | **Distillation Cosmique**       | $500\text{ GRP} + 1\,000\text{ }N_e$ | **Déclenche le Prestige** : compresse toute la partie en un _Modèle Fondateur_ permanent.       |

### Les Recettes Cachées (Découvertes par Expérimentation)

Certaines technologies exigent l'injection d'un type de donnée spécifique dans un Laboratoire plutôt qu'un simple achat en RP :

- **Antivirus Prédictif :** Envoyer volontairement $100$ paquets corrompus dans un Laboratoire isolé pour analyser leur signature virale (risque de mise en quarantaine du Laboratoire).
- **Compression Neuronale :** Alimenter un Laboratoire simultanément avec un flux déjà compressé et un Modèle IA de niveau 1.
- **Nœuds d'Ancrage Logique :** Faire survivre le réseau à $60\text{ secondes}$ de _Psychose Numérique_ ($\Phi - \Psi > 30\%$) sans effondrement total.

---

## 5. Conventions normatives après audit — version 1.0.0

Ces précisions lèvent les ambiguïtés de réalisation et assurent un chemin de progression jouable. Les coûts des 36 technologies et les objectifs chiffrés d’origine sont conservés. Les ajustements sont également consignés dans `CHANGELOG.md` et `BUGS_AND_AUDITS.md`.

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

### Fenêtres des recettes et sauvegarde

- Antivirus prédictif : 100 unités de paquets corrompus livrées au laboratoire ; la fraction contaminée est comptabilisée, avec quarantaine après accumulation d’un paquet complet. Le traitement IA laisse 0,1 % de la fraction contaminée sans perte d’octets.
- Compression neuronale : données compressées et modèle au même laboratoire dans une fenêtre de 30 secondes, tolérance explicite au décalage des chaînes.
- Ancrage : 60 secondes consécutives avec Φ−Ψ effectif >30, réseau encore vivant ; les réparations manuelles sont permises.
- Sauvegarde toutes les 30 secondes et à la sortie de l’onglet, export/import JSON validé et copie de secours.
- Hors ligne : 120 secondes de rejeu précis, puis jusqu’à 2 heures à 90 % uniquement pour un réseau sûr des ères 1–5, avec source et sans réserve en diminution. Les ères 6–9, les réseaux chauds, contaminés ou disjonctés ne reçoivent que le temps réellement rejoué. Une pause sauvegardée ne produit rien.

### Représentation, limites et preuve

La grille planétaire attribue une zone à chaque module et représente la dérive des flux ; elle ne simule pas le trajet physique individuel de chaque octet. À l’ère 8, les concepts remplacent les crédits comme objectif de progression, tandis que les constructions historiques se règlent encore en crédits jusqu’à l’ascension 9. La grille fractale de l’ère 9 est un espace virtuel de 32×32 cellules avec trame récursive bornée et auto-câblage effectif.

La campagne reproductible `tests/campaign.test.mjs` franchit 1→9→prestige en 3 733 secondes simulées en utilisant exclusivement les achats, réglages, recherches et flux accessibles au joueur. Cette preuve d’accessibilité ne remplace pas un test de rythme avec des joueurs. Les limites de validation du navigateur et des performances mobiles sont détaillées dans `BUGS_AND_AUDITS.md`.

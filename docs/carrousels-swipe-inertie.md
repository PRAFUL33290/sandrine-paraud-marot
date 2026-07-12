# Animations de swipe tactile des carrousels

Ce fichier documente comment le swipe au doigt a été réglé sur les deux
carrousels du site, pour pouvoir reproduire la même sensation ailleurs.

Il y a deux carrousels, avec deux logiques différentes car leur
fonctionnement de base n'est pas le même :

1. **Hero slider** (`index.html`, `.hero-slider` / `.hero-track`) — un
   carrousel classique à slides discrètes (une image à la fois), géré
   dans `navigation.js` → `initHeroSlider()`.
2. **Carrousel d'avis** (`contact.html`, `.reviews-track` /
   `.reviews-viewport`) — un bandeau à défilement continu et infini
   (marquee), géré dans `navigation.js` → `initReviewsMarquee()`.

Les deux utilisent l'API `PointerEvent` (pas `TouchEvent`), ce qui
marche à la fois au doigt et à la souris sans code dupliqué.

---

## 1. Hero slider — slides discrètes

### Principe général

- Pendant le drag : le carrousel suit le doigt **1:1**, en pixels, sans
  aucune transition CSS (`transition: none` via la classe
  `.is-dragging`).
- Au relâchement : une transition CSS anime le retour à la position
  finale (slide suivant, précédent, ou retour au point de départ si le
  geste n'était pas assez ample).

### Suivi du doigt (pendant le drag)

```js
dragSurface.addEventListener("pointermove", (event) => {
  const maxDrag = dragSurface.clientWidth; // 100% de la largeur, pas de plafond artificiel
  dragDeltaX = clamp(event.clientX - dragStartX, -maxDrag, maxDrag);
  setTransform(dragDeltaX); // translateX(calc(trackPosition * -100% + dragDeltaXpx))

  // vélocité en px/ms, pour détecter les flicks rapides
  const elapsed = event.timeStamp - dragLastTime;
  if (elapsed > 0) {
    dragVelocity = (event.clientX - dragLastX) / elapsed;
  }
  dragLastX = event.clientX;
  dragLastTime = event.timeStamp;
});
```

Point important : `maxDrag` doit être égal à **100% de la largeur**
(`dragSurface.clientWidth`), pas moins. Un plafond plus bas (on avait
essayé 92%) fait que le slide "se bloque" avant que le doigt n'ait fini
sa course, ce qui donne un effet ressort/aimant désagréable.

### Détection du geste au relâchement (`endDrag`)

Deux façons de déclencher un changement de slide :

- **Distance parcourue** : si le doigt a dépassé un seuil de **35% de
  la largeur** du carrousel.
- **Vélocité (flick)** : si la vitesse au relâchement dépasse
  **1.1 px/ms**, même si la distance parcourue est faible. Ça capture
  les gestes rapides et courts, comme sur iOS.

```js
const threshold = width * 0.35;
const isFlick = Math.abs(dragVelocity) > flickVelocityThreshold; // 1.1 px/ms
const wentRight = dragDeltaX > threshold || (isFlick && dragDeltaX > 0);
const wentLeft = dragDeltaX < -threshold || (isFlick && dragDeltaX < 0);
```

### Durée de la transition de relâchement : proportionnelle à la distance restante

C'est le réglage le plus important pour que ça ne paraisse ni trop
lent ni trop brusque. Une durée **fixe** (par ex. toujours 750ms) pose
deux problèmes :

- Sur un swipe **lent et court**, la transition finale semble traîner.
- Sur un swipe **rapide et ample** (le doigt a déjà parcouru presque
  toute la largeur), il ne reste qu'un petit bout à animer : avec une
  durée fixe et un easing à démarrage lent, ce petit reste "traîne" un
  instant avant de suivre, ce qui donne une impression de saccade.

La solution : calculer la durée en fonction de la **distance qu'il
reste à parcourir**, pas de la distance totale d'un slide.

```js
const releaseEasing = "cubic-bezier(0.4, 0, 0.2, 1)"; // easing "standard" Material, doux au début et à la fin
const releaseBaseDuration = 750; // ms, utilisé quand il reste (presque) 100% de la distance à parcourir
const releaseMinDuration = 200;  // ms, plancher quand il ne reste presque rien à parcourir

const remainingRatio = wentRight || wentLeft
  ? clamp(1 - Math.abs(dragDeltaX) / width, 0, 1) // distance restante avant le prochain slide
  : clamp(Math.abs(dragDeltaX) / width, 0, 1);    // distance restante avant de revenir au point de départ

const duration = Math.round(clamp(releaseBaseDuration * remainingRatio, releaseMinDuration, releaseBaseDuration));
```

### Éviter le saut visuel au moment du relâchement

Juste avant de changer la transition CSS, il faut re-appliquer la
position exacte du dernier point de drag et forcer un reflow, sinon le
navigateur peut "sauter" une frame et l'animation démarre d'un point
légèrement différent de celui où était vraiment le doigt :

```js
setTransform(dragDeltaX); // committe la dernière position du drag
void track.offsetWidth;   // force un reflow synchrone
track.style.transition = `transform ${duration}ms ${releaseEasing}`; // seulement après le reflow
```

### Récap des constantes retenues (hero slider)

| Paramètre | Valeur | Rôle |
|---|---|---|
| `maxDrag` | 100% de la largeur | Le doigt n'est jamais "plafonné" avant la fin d'un slide |
| Seuil de distance | 35% de la largeur | Distance minimale pour changer de slide sans flick |
| `flickVelocityThreshold` | 1.1 px/ms | Vitesse à partir de laquelle un petit geste rapide change quand même de slide |
| `releaseEasing` | `cubic-bezier(0.4, 0, 0.2, 1)` | Easing "standard", doux à l'entrée et à la sortie |
| `releaseBaseDuration` | 750ms | Durée max (utilisée quand ~100% de la distance reste à parcourir) |
| `releaseMinDuration` | 200ms | Durée min (utilisée quand il ne reste presque rien à parcourir) |

Ces valeurs sont le résultat d'itérations successives sur le ressenti
("trop rapide", "trop lent", "ça part encore trop vite au lâcher")
plutôt qu'un calcul théorique — à ajuster à l'oreille si on les
réutilise ailleurs.

---

## 2. Carrousel d'avis — défilement continu (marquee)

Ce carrousel défile tout seul en continu à vitesse constante
(`pxPerSecond = 40`). Le swipe ne change pas de "slide" : il doit juste
pouvoir pousser/tirer le défilement à la main, puis relâcher avec une
sensation d'inertie naturelle (comme un scroll iOS), avant de reprendre
la vitesse de croisière — sans à-coup au moment du lâcher.

### Suivi du doigt (identique dans l'esprit au hero)

```js
viewport.addEventListener("pointermove", (event) => {
  const deltaX = event.clientX - dragStartX;
  position = dragStartPosition - deltaX; // suit le doigt 1:1
  applyTransform();

  const elapsed = event.timeStamp - dragLastTime;
  if (elapsed > 0) {
    // vélocité de `position` (pas du doigt) : on inverse le signe
    // car position augmente quand le doigt va vers la gauche
    dragVelocity = -(event.clientX - dragLastX) / elapsed;
  }
  dragLastX = event.clientX;
  dragLastTime = event.timeStamp;
});
```

### Inertie au relâchement (au lieu d'un snap)

Comme il n'y a pas de "slide cible" ici, il n'y a pas de transition CSS
à durée fixe. À la place, on injecte la vélocité du relâchement dans la
boucle d'animation (`requestAnimationFrame`) et on la fait décroître
exponentiellement vers la vitesse de croisière du marquee
(`baseVelocity`), frame par frame :

```js
const baseVelocity = pxPerSecond / 1000; // vitesse de croisière, en px/ms
const momentumFriction = 0.94;           // décroissance appliquée toutes les ~16.7ms (60fps)
const momentumSettleEpsilon = 0.02;      // en dessous de cet écart, on considère que c'est "posé"

// dans la boucle tick(), à chaque frame :
if (Math.abs(momentumVelocity - baseVelocity) > momentumSettleEpsilon) {
  position += momentumVelocity * delta;
  const decay = Math.pow(momentumFriction, delta / 16.6667); // indépendant du framerate
  momentumVelocity = baseVelocity + (momentumVelocity - baseVelocity) * decay;
} else {
  momentumVelocity = baseVelocity;
  position += (pxPerSecond * delta) / 1000;
}
```

Au `pointerup`, si l'utilisateur a vraiment fait glisser (pas juste
tapé pour mettre en pause), on clamp la vélocité mesurée pour éviter un
flick disproportionné, puis on la confie à la boucle ci-dessus :

```js
const maxVelocity = 3.5; // px/ms, plafond de sécurité
momentumVelocity = Math.min(Math.max(dragVelocity, -maxVelocity), maxVelocity);
```

Résultat : peu importe la direction ou la vitesse du flick, le
carrousel "glisse" puis ralentit/accélère en douceur jusqu'à retrouver
sa vitesse de croisière normale, sans jamais s'arrêter brutalement ni
repartir d'un coup sec.

### Récap des constantes retenues (carrousel d'avis)

| Paramètre | Valeur | Rôle |
|---|---|---|
| `pxPerSecond` | 40 | Vitesse de croisière du défilement automatique |
| `momentumFriction` | 0.94 par frame (~16.7ms) | Vitesse à laquelle l'inertie retombe vers la vitesse de croisière |
| `momentumSettleEpsilon` | 0.02 px/ms | Seuil en dessous duquel on considère l'inertie "posée" |
| `maxVelocity` (clamp au relâchement) | 3.5 px/ms | Évite qu'un flick très violent envoie une vitesse absurde |

---

## Pour réutiliser ailleurs

- **Carrousel à slides discrètes** → reprendre la logique du hero
  slider : suivi 1:1 sans plafond artificiel, seuil de distance +
  détection de flick par vélocité, durée de transition proportionnelle
  à la distance restante, et le "commit + reflow" avant de changer de
  transition pour éviter le saut visuel.
- **Bandeau à défilement continu** → reprendre la logique du marquee :
  suivi 1:1 pendant le drag, puis injection de la vélocité mesurée
  comme "élan" qui décroît exponentiellement vers la vitesse de
  croisière dans la boucle d'animation existante.

Dans les deux cas, l'API à utiliser est `PointerEvent`
(`pointerdown` / `pointermove` / `pointerup` / `pointercancel`), avec
`setPointerCapture` sur `pointerdown` pour continuer à recevoir les
`pointermove` même si le doigt sort de l'élément.

Code source de référence : `navigation.js`, fonctions
`initHeroSlider()` et `initReviewsMarquee()`.

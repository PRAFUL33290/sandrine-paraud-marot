document.addEventListener("DOMContentLoaded", () => {
  const initHeroSlider = () => {
    const slider = document.querySelector(".hero-slider");
    const track = slider ? slider.querySelector(".hero-track") : null;
    const dragSurface = slider ? slider.closest(".hero") || slider : null;
    if (!slider || !track) {
      return;
    }

    const allSlides = Array.from(track.querySelectorAll(".hero-slide"));
    const realSlides = allSlides.filter((slide) => !slide.classList.contains("hero-slide-clone"));
    const dots = Array.from(document.querySelectorAll(".hero-dot"));
    const totalReal = realSlides.length;
    if (totalReal < 2) {
      return;
    }

    const hasClones = allSlides.length === totalReal + 2;
    let trackPosition = hasClones ? 1 : 0;
    let realIndex = 0;
    let animationFallbackTimer = null;
    let queuedSteps = 0;
    let isAnimating = false;
    let isDragging = false;
    let dragStartX = 0;
    let dragDeltaX = 0;
    let pointerId = null;
    let dragLastX = 0;
    let dragLastTime = 0;
    let dragVelocity = 0;

    const releaseEasing = "cubic-bezier(0.4, 0, 0.2, 1)";
    const releaseBaseDuration = 750;
    const releaseMinDuration = 200;
    const flickVelocityThreshold = 1.1; // px/ms

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const clearAnimationFallback = () => {
      if (animationFallbackTimer) {
        window.clearTimeout(animationFallbackTimer);
        animationFallbackTimer = null;
      }
    };

    const unlockAnimation = () => {
      clearAnimationFallback();
      isAnimating = false;
    };

    const queueStep = (direction) => {
      queuedSteps = clamp(queuedSteps + direction, -totalReal, totalReal);
    };

    const setTransform = (extraPx) => {
      track.style.transform = `translateX(calc(${trackPosition * -100}% + ${extraPx || 0}px))`;
    };

    const updateDots = () => {
      dots.forEach((dot, index) => dot.classList.toggle("is-active", index === realIndex));
    };

    const syncRealIndex = () => {
      const offset = hasClones ? trackPosition - 1 : trackPosition;
      realIndex = ((offset % totalReal) + totalReal) % totalReal;
    };

    // Snap instantly (no transition) once we've animated onto a cloned edge
    // slide, so the loop can keep animating in the same direction forever.
    const snapTo = (position) => {
      track.style.transition = "none";
      trackPosition = position;
      setTransform();
      void track.offsetWidth;
      track.style.transition = "";
      syncRealIndex();
      updateDots();
      unlockAnimation();
    };

    const playQueuedStep = () => {
      if (isAnimating || isDragging || queuedSteps === 0) {
        return;
      }

      const direction = queuedSteps > 0 ? 1 : -1;
      queuedSteps -= direction;
      window.requestAnimationFrame(() => advance(direction));
    };

    const finishAnimation = () => {
      if (hasClones && trackPosition === 0) {
        snapTo(totalReal);
      } else if (hasClones && trackPosition === totalReal + 1) {
        snapTo(1);
      } else {
        unlockAnimation();
      }

      playQueuedStep();
    };

    const goToTrackPosition = (position) => {
      if (position === trackPosition) {
        syncRealIndex();
        setTransform();
        updateDots();
        return;
      }

      trackPosition = position;
      syncRealIndex();
      isAnimating = true;
      setTransform();
      updateDots();
      clearAnimationFallback();
      animationFallbackTimer = window.setTimeout(finishAnimation, 1200);
    };

    const goToIndex = (index) => {
      if (isAnimating) {
        queuedSteps = 0;
        return;
      }

      if (hasClones && realIndex === totalReal - 1 && index === 0) {
        advance(1);
        return;
      }

      if (hasClones && realIndex === 0 && index === totalReal - 1) {
        advance(-1);
        return;
      }

      goToTrackPosition(hasClones ? index + 1 : index);
    };

    const advance = (direction) => {
      if (isDragging) {
        return;
      }

      if (isAnimating) {
        queueStep(direction);
        return;
      }

      if (hasClones && direction > 0 && trackPosition >= totalReal + 1) {
        snapTo(1);
      } else if (hasClones && direction < 0 && trackPosition <= 0) {
        snapTo(totalReal);
      }

      goToTrackPosition(trackPosition + direction);
    };

    track.addEventListener("transitionend", (event) => {
      if (event.propertyName !== "transform") {
        return;
      }

      track.style.transition = "";
      finishAnimation();
    });

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        goToIndex(index);
      });
    });

    const prevArrow = document.querySelector(".hero-arrow-prev");
    const nextArrow = document.querySelector(".hero-arrow-next");

    if (prevArrow) {
      prevArrow.addEventListener("click", () => {
        advance(-1);
      });
    }

    if (nextArrow) {
      nextArrow.addEventListener("click", () => {
        advance(1);
      });
    }

    const endDrag = () => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      track.classList.remove("is-dragging");
      dragSurface.classList.remove("is-dragging");

      const width = dragSurface.clientWidth;
      const threshold = width * 0.35;
      const isFlick = Math.abs(dragVelocity) > flickVelocityThreshold;
      const wentRight = dragDeltaX > threshold || (isFlick && dragDeltaX > 0);
      const wentLeft = dragDeltaX < -threshold || (isFlick && dragDeltaX < 0);

      // Scale the release duration to the distance still left to travel, so a
      // fast swipe that already covered most of the width (and only has a
      // sliver left) doesn't linger on a slow-start easing before catching up.
      const remainingRatio = wentRight || wentLeft
        ? clamp(1 - Math.abs(dragDeltaX) / width, 0, 1)
        : clamp(Math.abs(dragDeltaX) / width, 0, 1);
      const duration = Math.round(clamp(releaseBaseDuration * remainingRatio, releaseMinDuration, releaseBaseDuration));

      // Commit the exact last dragged position as a real paint before switching
      // to the release transition, so the animation starts from where the
      // finger actually was instead of jumping from a stale, unpainted frame.
      setTransform(dragDeltaX);
      void track.offsetWidth;
      track.style.transition = `transform ${duration}ms ${releaseEasing}`;

      if (wentRight) {
        advance(-1);
      } else if (wentLeft) {
        advance(1);
      } else {
        setTransform();
      }

      dragDeltaX = 0;
      dragVelocity = 0;
    };

    const isInteractiveTarget = (target) => Boolean(target.closest("a, button, input, select, textarea, label"));

    dragSurface.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      if (isAnimating) {
        return;
      }

      isDragging = true;
      pointerId = event.pointerId;
      dragStartX = event.clientX;
      dragDeltaX = 0;
      dragLastX = event.clientX;
      dragLastTime = event.timeStamp;
      dragVelocity = 0;
      track.style.transition = "";
      track.classList.add("is-dragging");
      dragSurface.classList.add("is-dragging");
      dragSurface.setPointerCapture(pointerId);
    });

    dragSurface.addEventListener("pointermove", (event) => {
      if (!isDragging || event.pointerId !== pointerId) {
        return;
      }

      event.preventDefault();
      const maxDrag = dragSurface.clientWidth;
      dragDeltaX = clamp(event.clientX - dragStartX, -maxDrag, maxDrag);
      setTransform(dragDeltaX);

      const elapsed = event.timeStamp - dragLastTime;
      if (elapsed > 0) {
        dragVelocity = (event.clientX - dragLastX) / elapsed;
      }
      dragLastX = event.clientX;
      dragLastTime = event.timeStamp;
    });

    dragSurface.addEventListener("pointerup", endDrag);
    dragSurface.addEventListener("pointercancel", endDrag);

    syncRealIndex();
    updateDots();

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const autoplayDelay = 6000;
    let autoplayTimer = null;
    let isAutoplayPaused = false;
    let isHeroInView = true;

    const scheduleAutoplay = () => {
      window.clearTimeout(autoplayTimer);
      if (prefersReducedMotion || isAutoplayPaused || !isHeroInView) {
        return;
      }
      autoplayTimer = window.setTimeout(() => {
        advance(1);
        scheduleAutoplay();
      }, autoplayDelay);
    };

    const pauseAutoplay = () => {
      isAutoplayPaused = true;
      window.clearTimeout(autoplayTimer);
    };

    const resumeAutoplay = () => {
      isAutoplayPaused = false;
      scheduleAutoplay();
    };

    if (!prefersReducedMotion) {
      dragSurface.addEventListener("pointerdown", pauseAutoplay);
      dragSurface.addEventListener("pointerup", resumeAutoplay);
      dragSurface.addEventListener("pointercancel", resumeAutoplay);
      dragSurface.addEventListener("focusin", pauseAutoplay);
      dragSurface.addEventListener("focusout", resumeAutoplay);

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              isHeroInView = entry.isIntersecting;
              if (isHeroInView) {
                scheduleAutoplay();
              } else {
                window.clearTimeout(autoplayTimer);
              }
            });
          },
          { threshold: 0.4 }
        );
        observer.observe(dragSurface);
      } else {
        scheduleAutoplay();
      }
    }
  };

  initHeroSlider();

  const initReviewsMarquee = () => {
    const track = document.querySelector(".reviews-track");
    if (!track) {
      return;
    }

    const cards = Array.from(track.children);
    if (cards.length < 2) {
      return;
    }

    const viewport = document.createElement("div");
    viewport.className = "reviews-viewport";
    track.parentNode.insertBefore(viewport, track);
    viewport.appendChild(track);

    cards.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });

    viewport.setAttribute("role", "group");
    viewport.setAttribute("tabindex", "0");
    viewport.setAttribute("aria-label", "Avis clients, glisser pour faire défiler, appuyer pour mettre en pause");

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pxPerSecond = 40;

    let loopWidth = 0;
    const setLoopWidth = () => {
      loopWidth = track.scrollWidth / 2;
    };
    setLoopWidth();
    window.addEventListener("resize", setLoopWidth);

    let position = 0;
    let isPaused = false;
    let isDragging = false;
    let hasDragged = false;
    let pointerId = null;
    let dragStartX = 0;
    let dragStartPosition = 0;
    let lastFrameTime = null;
    let isRunning = false;
    let isInView = false;
    let dragLastX = 0;
    let dragLastTime = 0;
    let dragVelocity = 0;
    let momentumVelocity = 0;

    const baseVelocity = pxPerSecond / 1000; // px/ms
    const momentumFriction = 0.94; // decay applied every ~16.7ms frame
    const momentumSettleEpsilon = 0.02; // px/ms difference from baseVelocity to consider settled

    const applyTransform = () => {
      const normalized = loopWidth > 0 ? ((position % loopWidth) + loopWidth) % loopWidth : 0;
      track.style.transform = `translateX(${-normalized}px)`;
    };

    const tick = (time) => {
      if (lastFrameTime === null) {
        lastFrameTime = time;
      }
      const delta = time - lastFrameTime;
      lastFrameTime = time;

      if (!isPaused && !isDragging && !prefersReducedMotion) {
        if (Math.abs(momentumVelocity - baseVelocity) > momentumSettleEpsilon) {
          position += momentumVelocity * delta;
          const decay = Math.pow(momentumFriction, delta / 16.6667);
          momentumVelocity = baseVelocity + (momentumVelocity - baseVelocity) * decay;
        } else {
          momentumVelocity = baseVelocity;
          position += (pxPerSecond * delta) / 1000;
        }
        applyTransform();
      }

      if (isInView) {
        window.requestAnimationFrame(tick);
      } else {
        isRunning = false;
      }
    };

    const startTick = () => {
      if (isRunning) {
        return;
      }
      isRunning = true;
      lastFrameTime = null;
      window.requestAnimationFrame(tick);
    };

    if ("IntersectionObserver" in window) {
      const visibilityObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          isInView = entry.isIntersecting;
          if (isInView) {
            startTick();
          }
        });
      });
      visibilityObserver.observe(viewport);
    } else {
      isInView = true;
      startTick();
    }

    const togglePause = () => {
      isPaused = !isPaused;
      viewport.classList.toggle("is-paused", isPaused);
    };

    const isInteractiveTarget = (target) => Boolean(target.closest("a, button, input, select, textarea, label"));

    viewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") {
        return;
      }

      if (isInteractiveTarget(event.target)) {
        return;
      }

      isDragging = true;
      hasDragged = false;
      pointerId = event.pointerId;
      dragStartX = event.clientX;
      dragStartPosition = position;
      dragLastX = event.clientX;
      dragLastTime = event.timeStamp;
      dragVelocity = 0;
      momentumVelocity = baseVelocity;
      viewport.classList.add("is-dragging");
      viewport.setPointerCapture(pointerId);
    });

    viewport.addEventListener("pointermove", (event) => {
      if (!isDragging || event.pointerId !== pointerId) {
        return;
      }

      const deltaX = event.clientX - dragStartX;
      if (Math.abs(deltaX) > 4) {
        hasDragged = true;
      }
      position = dragStartPosition - deltaX;
      applyTransform();

      const elapsed = event.timeStamp - dragLastTime;
      if (elapsed > 0) {
        // Velocity of `position` itself (px/ms): moving the finger right
        // (positive clientX delta) decreases position, hence the negation.
        dragVelocity = -(event.clientX - dragLastX) / elapsed;
      }
      dragLastX = event.clientX;
      dragLastTime = event.timeStamp;
    });

    const endDrag = (event) => {
      if (!isDragging || (event && event.pointerId !== pointerId)) {
        return;
      }

      isDragging = false;
      viewport.classList.remove("is-dragging");

      if (!hasDragged) {
        togglePause();
      } else {
        // Carry the release velocity into the auto-scroll as decaying
        // momentum, the same natural "let go and it glides" feel as the
        // hero slider's swipe release, instead of snapping straight back
        // to the constant marquee speed.
        const maxVelocity = 3.5; // px/ms
        momentumVelocity = Math.min(Math.max(dragVelocity, -maxVelocity), maxVelocity);
      }

      dragVelocity = 0;
    };

    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    viewport.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      togglePause();
    });

    // Prev/next arrows: a visible hint that the row can be swiped/scrolled,
    // on top of the drag support above. They nudge the marquee by roughly
    // one viewport's worth of cards, with a short eased transition, then
    // hand back control to the auto-drift.
    const carousel = document.createElement("div");
    carousel.className = "reviews-carousel";
    viewport.parentNode.insertBefore(carousel, viewport);
    carousel.appendChild(viewport);

    let arrowTransitionTimer = null;
    const stepBy = (direction) => {
      const wasPaused = isPaused;
      isPaused = true;
      position += viewport.clientWidth * 0.86 * direction;
      track.style.transition = "transform 480ms cubic-bezier(0.22, 1, 0.36, 1)";
      applyTransform();
      window.clearTimeout(arrowTransitionTimer);
      arrowTransitionTimer = window.setTimeout(() => {
        track.style.transition = "";
        isPaused = wasPaused;
      }, 480);
    };

    const makeArrow = (direction, label) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `reviews-arrow reviews-arrow-${direction > 0 ? "next" : "prev"}`;
      button.setAttribute("aria-label", label);
      button.innerHTML =
        '<svg class="reviews-arrow-icon" aria-hidden="true"><use href="assets/icons.svg#icon-chevron"></use></svg>';
      button.addEventListener("click", () => stepBy(direction));
      return button;
    };

    carousel.insertBefore(makeArrow(-1, "Avis précédents"), viewport);
    carousel.appendChild(makeArrow(1, "Avis suivants"));
  };

  initReviewsMarquee();

  // In-page "jump to section" links (e.g. the contact hero's "Aller au
  // formulaire" button): scroll smoothly but never write the target's id to
  // the URL, so reloading the page always lands at the top like normal
  // instead of re-triggering the anchor jump.
  const initInPageAnchors = () => {
    const links = Array.from(document.querySelectorAll('a[href^="#"]'));
    links.forEach((link) => {
      const id = link.getAttribute("href").slice(1);
      if (!id) {
        return;
      }
      const target = document.getElementById(id);
      if (!target) {
        return;
      }
      link.addEventListener("click", (event) => {
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  };

  initInPageAnchors();

  const initFaqAccordion = () => {
    const items = Array.from(document.querySelectorAll(".faq-item"));
    if (items.length === 0) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      return;
    }

    const animationsByItem = new WeakMap();

    const closeItem = (item, summary) => {
      const existingAnimation = animationsByItem.get(item);
      if (existingAnimation) {
        existingAnimation.cancel();
      }

      if (!item.open) {
        return;
      }

      const startHeight = item.scrollHeight;
      item.style.overflow = "hidden";
      item.style.height = `${startHeight}px`;

      const animation = item.animate(
        [{ height: `${startHeight}px` }, { height: `${summary.offsetHeight}px` }],
        { duration: 200, easing: "ease" }
      );
      animationsByItem.set(item, animation);

      animation.onfinish = () => {
        item.open = false;
        item.style.height = "";
        item.style.overflow = "";
        animationsByItem.delete(item);
      };
    };

    const openItem = (item, summary) => {
      const existingAnimation = animationsByItem.get(item);
      if (existingAnimation) {
        existingAnimation.cancel();
      }

      item.style.overflow = "hidden";
      item.open = true;
      const targetHeight = item.scrollHeight;
      item.style.height = `${summary.offsetHeight}px`;

      const animation = item.animate(
        [{ height: `${summary.offsetHeight}px` }, { height: `${targetHeight}px` }],
        { duration: 220, easing: "ease" }
      );
      animationsByItem.set(item, animation);

      animation.onfinish = () => {
        item.style.height = "";
        item.style.overflow = "";
        animationsByItem.delete(item);
      };
    };

    items.forEach((item) => {
      const summary = item.querySelector("summary");
      const content = item.querySelector("p");

      if (!summary || !content) {
        return;
      }

      summary.addEventListener("click", (event) => {
        event.preventDefault();

        if (item.open) {
          closeItem(item, summary);
          return;
        }

        items.forEach((otherItem) => {
          if (otherItem !== item && otherItem.open) {
            const otherSummary = otherItem.querySelector("summary");
            if (otherSummary) {
              closeItem(otherItem, otherSummary);
            }
          }
        });

        openItem(item, summary);
      });
    });
  };

  initFaqAccordion();

  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".nav");

  if (header) {
    const updateHeaderScrollState = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 12);
    };

    updateHeaderScrollState();
    window.addEventListener("scroll", updateHeaderScrollState, { passive: true });
  }
  const menuToggle = document.querySelector(".menu-toggle");
  // Nav breakpoint: doit rester synchronisé avec styles.css (@media max-width/min-width autour de la nav)
  const mobileMenuQuery = window.matchMedia("(max-width: 1199px)");
  const navIconByPage = {
    "index.html": "icon-bloom",
    "approche.html": "icon-leaf",
    "outils.html": "icon-spark",
    "accompagnements.html": "icon-heart",
    "services.html": "icon-sun",
    "parcours.html": "icon-bloom",
    "contact.html": "icon-mail",
    "blog.html": "icon-quill",
  };

  const addResponsiveNavIcons = () => {
    if (!nav) {
      return;
    }

    nav.querySelectorAll("a").forEach((link) => {
      const href = link.getAttribute("href");

      if (!href || link.querySelector(".nav-item-icon")) {
        return;
      }

      const page = href.split("#")[0];
      const iconId = navIconByPage[page];

      if (!iconId) {
        return;
      }

      link.prepend(createSvgIcon(iconId, "nav-item-icon"));
    });
  };

  const createSvgIcon = (iconId, className) => {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    const use = document.createElementNS("http://www.w3.org/2000/svg", "use");

    icon.classList.add(className);
    icon.setAttribute("aria-hidden", "true");
    use.setAttribute("href", `assets/icons.svg#${iconId}`);
    icon.appendChild(use);

    return icon;
  };

  const addMobileNavCta = () => {
    if (!nav || nav.querySelector(".nav-mobile-cta")) {
      return;
    }

    const cta = document.createElement("a");
    cta.classList.add("button", "nav-mobile-cta");
    cta.href = "contact.html";
    cta.innerHTML = `<svg class="button-icon" aria-hidden="true"><use href="assets/icons.svg#icon-sun"></use></svg>Prendre rendez-vous`;

    const currentPage = window.location.pathname.split("/").pop() || "index.html";
    cta.classList.toggle("active", currentPage === "contact.html");

    nav.append(cta);
  };

  const addMobileContactBlock = () => {
    if (!nav || nav.querySelector(".mega-mobile-contact")) {
      return;
    }

    const contact = document.createElement("div");
    contact.classList.add("mega-mobile-contact");
    contact.innerHTML = `
      <span class="mega-title">Contact</span>
      <strong>Sandrine Paraud Marot</strong>
      <small>Sophrologue · Potentiel du Moi</small>
      <a href="mailto:contact@sandrine-paraud-marot.fr">contact@sandrine-paraud-marot.fr</a>
      <div class="mega-mobile-socials" aria-label="Réseaux sociaux">
        <a href="https://www.facebook.com/Sandrine-Paraud-Marot-104502974451012/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"></a>
        <a href="https://www.instagram.com/sandrineparaudmarot_pro/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"></a>
      </div>
    `;

    const socialLinks = contact.querySelectorAll(".mega-mobile-socials a");
    socialLinks[0].prepend(createSvgIcon("icon-facebook", "social-icon"));
    socialLinks[1].prepend(createSvgIcon("icon-instagram", "social-icon"));
    nav.append(contact);
  };

  const addMobileLegalLinks = () => {
    if (!nav || nav.querySelector(".mega-mobile-legal")) {
      return;
    }

    const legal = document.createElement("div");
    legal.classList.add("mega-mobile-legal");
    legal.innerHTML = `
      <a href="mentions-legales.html">Mentions légales</a>
      <a href="politique-confidentialite.html">Politique de confidentialité</a>
    `;

    const legalLinks = legal.querySelectorAll("a");
    legalLinks[0].prepend(createSvgIcon("icon-document", "footer-nav-icon"));
    legalLinks[1].prepend(createSvgIcon("icon-shield", "footer-nav-icon"));
    nav.append(legal);
  };

  addResponsiveNavIcons();
  addMobileNavCta();
  addMobileContactBlock();
  addMobileLegalLinks();

  const setMenuOpen = (isOpen) => {
    document.body.classList.toggle("menu-open", isOpen);
    if (!isOpen) {
      dropdownControllers.forEach(({ setOpen }) => setOpen(false));
    }

    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Fermer le menu" : "Ouvrir le menu");
    }
  };

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      setMenuOpen(!document.body.classList.contains("menu-open"));
    });
  }

  const megaMenus = Array.from(document.querySelectorAll(".nav-mega"));
  const dropdownControllers = [];

  megaMenus.forEach((menuEl) => {
    const trigger = menuEl.querySelector(".mega-trigger");

    if (!trigger) {
      return;
    }

    trigger.setAttribute("aria-expanded", "false");

    const simplePanel = menuEl.querySelector(".mega-panel-simple");

    const positionSimplePanel = () => {
      if (!simplePanel || mobileMenuQuery.matches) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      simplePanel.style.left = `${rect.left}px`;
    };

    const setOpen = (isOpen) => {
      menuEl.classList.toggle("is-open", isOpen);
      trigger.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) {
        positionSimplePanel();
      }
    };

    trigger.addEventListener("click", (event) => {
      if (!mobileMenuQuery.matches) {
        setOpen(false);
        return;
      }

      event.preventDefault();
      setOpen(!menuEl.classList.contains("is-open"));
    });

    let closeTimer = null;

    const cancelClose = () => {
      if (closeTimer !== null) {
        window.clearTimeout(closeTimer);
        closeTimer = null;
      }
    };

    const scheduleClose = () => {
      cancelClose();
      closeTimer = window.setTimeout(() => {
        setOpen(false);
        closeTimer = null;
      }, 250);
    };

    menuEl.addEventListener("mouseenter", () => {
      if (mobileMenuQuery.matches) {
        return;
      }
      cancelClose();
      dropdownControllers.forEach((controller) => {
        if (controller.menuEl !== menuEl) {
          controller.cancelClose();
          controller.setOpen(false);
        }
      });
      setOpen(true);
    });

    menuEl.addEventListener("mouseleave", () => {
      if (mobileMenuQuery.matches) {
        return;
      }
      scheduleClose();
    });

    dropdownControllers.push({ menuEl, trigger, setOpen, cancelClose });
  });

  if (dropdownControllers.length === 0) {
    return;
  }

  document.addEventListener("click", (event) => {
    const target = event.target;

    if (
      document.body.classList.contains("menu-open") &&
      header &&
      nav &&
      menuToggle &&
      !nav.contains(target) &&
      !menuToggle.contains(target)
    ) {
      setMenuOpen(false);
    }

    if (!mobileMenuQuery.matches) {
      return;
    }

    dropdownControllers.forEach(({ menuEl, setOpen }) => {
      if (!menuEl.contains(target)) {
        setOpen(false);
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    setMenuOpen(false);
    dropdownControllers.forEach(({ setOpen, trigger }) => {
      setOpen(false);
      trigger.blur();
    });
  });
});

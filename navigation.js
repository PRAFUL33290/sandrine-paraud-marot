document.addEventListener("DOMContentLoaded", () => {
  const initHeroSlider = () => {
    const slider = document.querySelector(".hero-slider");
    const track = slider ? slider.querySelector(".hero-track") : null;
    if (!slider || !track) {
      return;
    }

    const slides = Array.from(track.querySelectorAll(".hero-slide"));
    const dots = Array.from(document.querySelectorAll(".hero-dot"));
    if (slides.length < 2) {
      return;
    }

    let current = 0;
    let autoplayTimer = null;
    let isDragging = false;
    let dragStartX = 0;
    let dragDeltaX = 0;
    let pointerId = null;

    const setTransform = (extraPx) => {
      track.style.transform = `translateX(calc(${current * -100}% + ${extraPx || 0}px))`;
    };

    const updateDots = () => {
      dots.forEach((dot, index) => dot.classList.toggle("is-active", index === current));
    };

    const goTo = (index) => {
      current = ((index % slides.length) + slides.length) % slides.length;
      setTransform();
      updateDots();
    };

    const stopAutoplay = () => {
      if (autoplayTimer) {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    };

    const startAutoplay = () => {
      stopAutoplay();
      autoplayTimer = window.setInterval(() => goTo(current + 1), 5000);
    };

    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        goTo(index);
        startAutoplay();
      });
    });

    const prevArrow = document.querySelector(".hero-arrow-prev");
    const nextArrow = document.querySelector(".hero-arrow-next");

    if (prevArrow) {
      prevArrow.addEventListener("click", () => {
        goTo(current - 1);
        startAutoplay();
      });
    }

    if (nextArrow) {
      nextArrow.addEventListener("click", () => {
        goTo(current + 1);
        startAutoplay();
      });
    }

    const endDrag = () => {
      if (!isDragging) {
        return;
      }

      isDragging = false;
      track.classList.remove("is-dragging");

      const threshold = slider.clientWidth * 0.15;
      if (dragDeltaX > threshold) {
        goTo(current - 1);
      } else if (dragDeltaX < -threshold) {
        goTo(current + 1);
      } else {
        setTransform();
      }

      dragDeltaX = 0;
      startAutoplay();
    };

    slider.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 && event.pointerType === "mouse") {
        return;
      }

      isDragging = true;
      pointerId = event.pointerId;
      dragStartX = event.clientX;
      dragDeltaX = 0;
      track.classList.add("is-dragging");
      stopAutoplay();
      slider.setPointerCapture(pointerId);
    });

    slider.addEventListener("pointermove", (event) => {
      if (!isDragging || event.pointerId !== pointerId) {
        return;
      }

      dragDeltaX = event.clientX - dragStartX;
      setTransform(dragDeltaX);
    });

    slider.addEventListener("pointerup", endDrag);
    slider.addEventListener("pointercancel", endDrag);

    goTo(0);
    startAutoplay();
  };

  initHeroSlider();

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
  const mega = document.querySelector(".nav-mega");
  const mobileMenuQuery = window.matchMedia("(max-width: 980px)");
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
  addMobileContactBlock();
  addMobileLegalLinks();

  const setMenuOpen = (isOpen) => {
    document.body.classList.toggle("menu-open", isOpen);
    if (!isOpen) {
      setOpen(false);
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

  if (!mega) {
    return;
  }

  const trigger = mega.querySelector(".mega-trigger");

  if (!trigger) {
    return;
  }

  trigger.setAttribute("aria-expanded", "false");

  const setOpen = (isOpen) => {
    mega.classList.toggle("is-open", isOpen);
    trigger.setAttribute("aria-expanded", String(isOpen));
  };

  trigger.addEventListener("click", (event) => {
    if (!mobileMenuQuery.matches) {
      setOpen(false);
      return;
    }

    event.preventDefault();
    setOpen(!mega.classList.contains("is-open"));
  });

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

    if (!mobileMenuQuery.matches || mega.contains(event.target)) {
      return;
    }

    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    setOpen(false);
    setMenuOpen(false);
    trigger.focus();
  });
});

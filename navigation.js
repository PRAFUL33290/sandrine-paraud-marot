document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".nav");
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
    "contact.html": "icon-spark",
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

      const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const use = document.createElementNS("http://www.w3.org/2000/svg", "use");

      icon.classList.add("nav-item-icon");
      icon.setAttribute("aria-hidden", "true");
      use.setAttribute("href", `assets/icons.svg#${iconId}`);
      icon.appendChild(use);
      link.prepend(icon);
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
      <small>Sophrologue · Potentiel du moi</small>
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

  const addMobileDrawerLogo = () => {
    if (!nav || nav.querySelector(".mobile-drawer-logo")) {
      return;
    }

    const logo = document.createElement("a");
    logo.classList.add("mobile-drawer-logo");
    logo.href = "index.html";
    logo.setAttribute("aria-label", "Accueil");
    logo.textContent = "SPM";
    nav.prepend(logo);
  };

  addResponsiveNavIcons();
  addMobileDrawerLogo();
  addMobileContactBlock();

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

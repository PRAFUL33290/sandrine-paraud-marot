document.addEventListener("DOMContentLoaded", () => {
  const header = document.querySelector(".site-header");
  const nav = document.querySelector(".nav");
  const menuToggle = document.querySelector(".menu-toggle");
  const mega = document.querySelector(".nav-mega");
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

    nav.querySelectorAll("a:not(.mega-trigger)").forEach((link) => {
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

  addResponsiveNavIcons();

  const setMenuOpen = (isOpen) => {
    document.body.classList.toggle("menu-open", isOpen);

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

    if (mega.contains(event.target)) {
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

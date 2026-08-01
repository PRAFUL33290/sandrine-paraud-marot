# sandrine-paraud-marot

Site vitrine statique (HTML/CSS/JS) déployé sur GitHub Pages via `.github/workflows/deploy.yml`.

## Structure

```
*.html                  Pages du site (à la racine = URLs publiques, ne pas déplacer)
styles.css              Feuille de styles unique
navigation.js           Navigation, menus, carrousels
contact-form.js         Formulaire de contact (front)
send-contact.php        Envoi du formulaire (back, hébergement PHP)
lib/                    Dépendances PHP (SMTP)
mail-config.sample.php  Modèle de config mail (mail-config.php est ignoré par git)

assets/                 Icônes, favicons, images d'interface
media/
  photos/               Photos du site (versions responsive)
  backgrounds/          Images de fond / parallax
  footer/               Images du footer
  site/                 Illustrations d'articles et de pages
  praful-design/        Logo Praful Design (crédit footer)
  video/                Vidéos

docs/                   Notes techniques
_sources/               Fichiers de travail, NON utilisés par le site
  notes/                Textes, briefs, docx
  design/               Logos et sources graphiques
  captures/             Captures d'écran
  affinity/             Fichiers .af (ignorés par git)
  images-non-utilisees/ Images non publiées

robots.txt, sitemap.xml, site.webmanifest, .htaccess, 404.html
```

## Règles

- Les pages HTML restent **à la racine** : les déplacer casserait les URLs et le référencement.
- Toute image utilisée par le site va dans `media/` (ou `assets/` pour l'UI) ; le reste dans `_sources/`.
- Après un déplacement de fichier, vérifier les références dans les `.html`, `styles.css` et `sitemap.xml`
  (attention aux espaces encodés `%20`).

# Capture Rig — Portfolio Source

Personal portfolio site for Muhammad Abrar Hussain (Master's researcher, Computer Engineering — Intelligent and Mixed Reality Lab, Chosun University). Plain HTML/CSS/JS, no build step, no framework, no dependencies to install.

## File structure

```
portfolio-source/
├── index.html          # full page markup (hero, about, research, publications, skills, awards, contact)
├── css/
│   └── style.css       # all styling: layout, light/dark theme tokens, animations, responsive rules
├── js/
│   └── script.js       # scroll-reveal, HUD scroll-spy/scrub bar, canvas visualizations, interactive widget
├── assets/
│   ├── images/         # (empty — no raster images used; all visuals are inline SVG or <canvas>)
│   ├── icons/          # (empty — icons are inline SVG in index.html)
│   └── fonts/          # (empty — fonts are loaded from Google Fonts, see "External dependency" below)
└── README.md
```

Every icon in the page (the scroll-cue chevron, the corner brackets, the favicon) is inline SVG inside `index.html`, and every diagram (the hero hand skeleton, the mini research-card visualizations, the interactive hand/cube/foot widget) is drawn live on `<canvas>` by `script.js` — nothing is a static image file, so `assets/images` and `assets/icons` are intentionally empty placeholders for future use.

## Running it locally

No install step is required. Because the page uses `fetch`-adjacent browser APIs and relative paths, open it through a local server rather than double-clicking the file (a `file://` origin can block some browser features):

```bash
cd portfolio-source
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Any static server works the same way — `npx serve`, VS Code's "Live Server" extension, etc.

## External dependency

The only external resource is **Google Fonts** (Bricolage Grotesque, Archivo, IBM Plex Mono), loaded via a `<link>` tag in the `<head>` of `index.html`:

```html
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;800&family=Archivo:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

This requires an internet connection to render with the intended typefaces; the CSS includes generic fallbacks (`ui-sans-serif`, `system-ui`, `ui-monospace`) so the page still looks reasonable offline. If you'd rather self-host the fonts (recommended for a locked-down intranet or for slightly faster loads), download the three font families as `.woff2` files into `assets/fonts/`, add `@font-face` rules at the top of `css/style.css`, and remove the Google Fonts `<link>` tags from `index.html`. No other code changes are needed.

## What's inside `script.js`

- Scroll-reveal animations (`IntersectionObserver`) for each section
- A HUD-style scroll-spy nav, a scroll-progress "scrub" bar, and a scroll-driven frame counter
- Two reusable canvas components — `makeHandSkeleton()` and `makeFootChannel()` — reused across the hero visual, the research-card mini visualizations, and the interactive "Grab, then walk" concept widget
- A hand-drawn 3D wireframe cube with simple spring physics for the concept widget
- `prefers-reduced-motion` support throughout, and an `IntersectionObserver`-based pause for any canvas that scrolls off screen

## Deployment notes

This is a fully static site — it deploys as-is to GitHub Pages, Netlify, Vercel, or any static host: push the contents of this folder to a repo and point the host at `index.html`. No environment variables, build command, or server-side code are involved. For a custom domain, follow your host's standard CNAME/DNS instructions after the initial deploy.

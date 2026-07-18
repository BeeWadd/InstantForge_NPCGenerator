# InstantForge

InstantForge is a browser-based toolkit for generating roleplay-ready NPCs, magic items, taverns, and weapons. It is a static site: generation happens in the browser from bundled JSON data, with no account, backend, or API key required.

[Open InstantForge](https://beewadd.github.io/InstantForge_NPCGenerator/)

## Features

- Four focused generators with editable fields and field locks.
- Saved histories that persist in the current browser.
- JSON, CSV, Markdown, and print-to-PDF exports.
- A tavern-to-NPC handoff for generating innkeepers and patrons.
- A responsive static interface deployable to any ordinary web host.

## Run locally

Prerequisites: Node.js 22 or a current Node.js LTS release.

```sh
npm install
npm run dev
```

Vite prints the local URL when the development server starts. No environment file or secret is needed.

Useful commands:

```sh
npm run lint          # Validate source files, JavaScript syntax, and generator data
npm run typecheck     # Type-check the Vite configuration
npm run test:unit     # Run generator-data and shared-utility tests
npm run build         # Build all five pages and verify the complete output
npm test              # Run every check and a production build
npm run preview       # Serve dist/ after a build
```

## Architecture

InstantForge is intentionally small and framework-free:

| Area | Files | Purpose |
| --- | --- | --- |
| Landing page | `index.html` | Links to each generator |
| Generator interfaces | `*-generator.html` | Page structure and content |
| Shared styling | `assets/css/instantforge.css` | Responsive layout and visual system |
| Generator behavior | `*-generator.js` | Page-specific generation and interaction modules |
| Shared browser code | `assets/js/` | Storage, safe rendering, exports, and landing-page tools |
| Content libraries | `*-data.json` | Source material used by each generator |
| Build | `vite.config.ts` | Explicit five-page Vite build and runtime-file emission |
| Verification | `scripts/` | Source and production-output integrity checks |

The Vite build has five HTML entry points: the landing page and the NPC, magic item, tavern, and weapon generators. Browser code uses ES modules, so Vite follows and bundles the HTML entries and shared imports. Generator JSON libraries are loaded with `fetch()`, so the build configuration emits those data files at stable paths. `scripts/verify-build.mjs` confirms that every required page, bundled module, data file, and referenced asset exists in `dist/`.

## Data and privacy

Generated results are created locally in the browser. Saved histories use `localStorage`, and the tavern-to-NPC handoff temporarily uses `sessionStorage`. Clearing a history in the app or clearing this site's browser data removes those records. Exports are created on the user's device.

The hosted pages load Google Fonts and currently include Google Analytics, so opening the hosted site can make requests to Google. InstantForge does not require a login and does not send generated or saved content to an InstantForge server.

## Deployment

Pull requests and branch pushes run the CI workflow. Pushes to `main` run the same checks, build a verified `dist/`, and deploy that exact artifact through GitHub Pages.

For a new fork, open **Settings → Pages** in GitHub and select **GitHub Actions** as the source. The workflow in `.github/workflows/deploy-pages.yml` handles subsequent deployments. Because the Vite build uses relative asset URLs, the output also works under a project subpath or on another static host.

## Adding or changing a generator

When adding a new page or runtime file, update all three build contracts:

1. Add the HTML entry to `pages` in `vite.config.ts`.
2. Add fetched data files to `dataFiles` in `vite.config.ts`; imported modules are discovered automatically.
3. Extend the expected file lists in `scripts/check-source.mjs` and `scripts/verify-build.mjs`.

Run `npm test` before opening a pull request.

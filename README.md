# InstantForge

InstantForge is a browser-based toolkit for generating roleplay-ready NPCs, magic items, taverns, and weapons. It is a static site: generation happens in the browser from bundled JSON data, with no account, backend, or API key required.

[Open InstantForge](https://beewadd.github.io/InstantForge_NPCGenerator/)

## Features

- Four focused generators with editable fields and field locks.
- Saved histories that persist in the current browser.
- A unified Your Forge page for browsing, searching, filtering, and managing every saved creation.
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
npm run build         # Build all six pages and verify the complete output
npm test              # Run every check and a production build
npm run preview       # Serve dist/ after a build
```

## Architecture

InstantForge is intentionally small and framework-free:

| Area | Files | Purpose |
| --- | --- | --- |
| Landing page | `index.html` | Links to each generator |
| Saved collection | `forge.html` | Unified view of all browser-local creations |
| Generator interfaces | `*-generator.html` | Page structure and content |
| Shared styling | `assets/css/instantforge.css` | Responsive layout and visual system |
| Generator behavior | `*-generator.js` | Page-specific generation and interaction modules |
| Shared browser code | `assets/js/` | Storage, safe rendering, Forge browsing, and transfer tools |
| Content libraries | `*-data.json` | Source material used by each generator |
| Build | `vite.config.ts` | Explicit six-page Vite build and runtime-file emission |
| Verification | `scripts/` | Source and production-output integrity checks |

The Vite build has six HTML entry points: the landing page, Your Forge, and the NPC, magic item, tavern, and weapon generators. Browser code uses ES modules, so Vite follows and bundles the HTML entries and shared imports. Generator JSON libraries are loaded with `fetch()`, so the build configuration emits those data files at stable paths. `scripts/verify-build.mjs` confirms that every required page, bundled module, data file, and referenced asset exists in `dist/`.

## Data and privacy

Generated results are created locally in the browser. Saved histories use `localStorage`, and the tavern-to-NPC handoff temporarily uses `sessionStorage`. Clearing a history in the app or clearing this site's browser data removes those records. Exports are created on the user's device.

Analytics are build-time disabled unless both `VITE_ENABLE_ANALYTICS=true` and a valid public `VITE_GA_MEASUREMENT_ID` are supplied. Even in an enabled build, the Google tag is not requested until the visitor explicitly allows analytics; Decline and Privacy settings keep the product fully usable. The consent record contains only `allow` or `decline` plus the policy version. Revoking consent stops future events and removes `_ga` cookies where the browser permits.

The only possible custom events are `generation_complete` and `save_complete` with `generator_type`; `forge_open` with `source_page`; `export_complete` with `format`; and `import_complete` with `result`. The wrapper rejects all other event names and parameters. Generated, saved, searched, imported, and exported content is never sent. Ads-related storage/data/personalization, Google Signals, remarketing, and cross-domain measurement are disabled in code. The support link remains a separate third-party destination.

Before enabling a production measurement ID, the property owner must complete [`docs/analytics-property-owner-checklist.md`](docs/analytics-property-owner-checklist.md). Those Google-property controls are deliberately separate from this static application and must be evidenced in the release PR.

## Deployment

Pull requests and branch pushes run the CI workflow. Pushes to `main` run the same checks, build a verified `dist/`, and deploy that exact artifact through GitHub Pages.

For a new fork, open **Settings → Pages** in GitHub and select **GitHub Actions** as the source. The workflow in `.github/workflows/deploy-pages.yml` handles subsequent deployments. Because the Vite build uses relative asset URLs, the output also works under a project subpath or on another static host.

## Adding or changing a generator

When adding a new page or runtime file, update all three build contracts:

1. Add the HTML entry to `pages` in `vite.config.ts`.
2. Add fetched data files to `dataFiles` in `vite.config.ts`; imported modules are discovered automatically.
3. Extend the expected file lists in `scripts/check-source.mjs` and `scripts/verify-build.mjs`.

Run `npm test` before opening a pull request.

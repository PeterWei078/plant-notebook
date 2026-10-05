# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

「拈花惹草」(home-screen short name「花草識」) — a personal, mobile-first PWA for identifying and learning the plants seen in daily life: photograph a plant, record its identifying features, flowering/fruiting months and habitats, and drill recognition with a photo quiz. Traditional Chinese UI throughout. Architecture deliberately mirrors the sibling project `../價值性事物運用App`.

## Commands

```bash
npm run dev       # Vite dev server (add -- --host to test from a phone on the same Wi-Fi)
npm run build     # tsc -b && vite build — the correctness gate (no test suite)
npm run preview   # serve the production build
npm run lint      # oxlint (one known warning in BlobImage: the object-URL effect pattern, intentional)
```

Deployment is GitHub (`plant-notebook`) → Vercel; pushing to `main` auto-deploys. Throwaway tooling (`sharp` for icons, `playwright` for browser checks) is installed in a scratch directory, never in this repo's `package.json`.

## Architecture

**Storage: Dexie (IndexedDB), on-device only.** `src/db/db.ts` defines two tables: `plants` and `options`. Photos are stored as raw `Blob`s inside each plant's `photos` array (max 3, `coverPhotoId` points at one of them; `coverPhoto()` in `types.ts` falls back to the first). Schema changes go in a new `this.version(n).stores(...).upgrade(...)` — never edit a shipped version.

**Repository layer.** `plantsRepo.ts` / `optionsRepo.ts` are the only writers. Pages read reactively with `useLiveQuery` directly on `db.*`. If cloud sync is added later, only the repos change.

**Option lists are one generic table.** Plant type (single-select) and habitat (multi-select) both live in `options`, distinguished by `listKey`. To add another user-editable list: add a key to `OptionListKey`, `OPTION_LIST_LABELS` and `DEFAULT_OPTIONS` in `types.ts` — `ensureDefaultOptions()` seeds any empty list, and Settings renders an editor for every key automatically. Seeding runs inside one transaction because StrictMode double-invokes effects (the sibling project hit a duplication bug here). Deleting an option calls `plantsRepo.detachOption` so plants never reference a missing id.

**Backward-compatible records.** `normalizePlant()` fills defaults for any field missing from older/imported records. When adding a field: add it to `Plant`, `emptyPlant()`, and rely on `normalizePlant` when loading (the form, detail page and backup import all go through it).

**Familiarity & quiz (`src/pages/QuizPage.tsx`).** Four-choice quiz; distractors are other plants' names. First try shows only the cover; a wrong answer reveals all photos for a second try. Outcome writes `familiarity` via `plantsRepo.setFamiliarity` (1st try → `familiar`, 2nd → `okay`, both wrong → `unfamiliar`), which deliberately does *not* bump `updatedAt`. A first-try correct answer auto-advances (user's explicit requirement). Only plants with a name and ≥1 photo are quizzable; at least 4 distinct names are needed overall.

**AI lookup skill ↔ app contract.** `.claude/skills/plant/SKILL.md` (`/plant <名稱>`) researches plants and emits `{"format":"plant-notebook/ai","version":1,"plants":[...]}`. The app consumes it in two places, both through `src/utils/aiImport.ts`: the form's「貼上 AI 查詢結果」(fills only fields the AI provided, never touches photos) and Settings import (adds new plants, skips existing names). AI data is always saved as `tentative` (暫定), never `confirmed`. Unknown type/habitat names are auto-added to the option lists. **If you change `AiPlant`, update the skill's output spec in the same change.**

**Export/Import (`src/utils/exportImport.ts`).** Backup = `{app:'plant-notebook', schemaVersion, options, plants}` with photos inlined as data URLs. `importFromJson` auto-detects backup vs. AI batch files. Bump `SCHEMA_VERSION` only when old app versions can't read the new format.

**Routing.** `HashRouter` (no server rewrites needed). Routes: `/`, `/plant/new`, `/plant/:id`, `/plant/:id/edit`, `/quiz`, `/settings`. Bottom nav shows on `/`, `/quiz`, `/settings`. Saving the form returns to `/` (same product decision as the sibling app). The home grid card shows only the Chinese name; scientific/family/alias/English names appear on the detail page only (user's explicit requirement).

**Photos.** `PhotoManager` uses `<input type="file" accept="image/*" multiple>` with **no `capture` attribute** — `capture` makes iOS skip the photo library. Images are compressed to ≤1280px JPEG by `compressImage` before storage.

**Icons.** `public/` PNGs + `favicon.svg` were generated from an SVG drawn in a throwaway script (variant B: sunny yellow→orange gradient, large magenta flower, small magnifier bottom-right showing the magnified stamen). "any" icons are full-bleed with no baked-in rounding; the maskable icon scales the art to 74% for Android's circle crop. Re-verify both masks if redesigning.

**Styling.** Plain CSS with custom properties in `src/index.css` (light + `prefers-color-scheme: dark`). Mobile-first single column, max-width 560px.

## Verifying changes

`npm run build` only proves it compiles. For anything user-facing, drive it in a headless browser at a phone viewport (390×844) against the dev server (StrictMode on) — real bugs in this app family have only shown up under interaction.

# Infinity Model Catalog

A sculpt-by-sculpt catalog of Corvus Belli Infinity miniatures, from the earliest releases through current models.

## Core catalog rules

- Human Sphere is the primary historical reference.
- Corvus Belli and other reliable catalog sources are used to cross-check records.
- Each physical sculpt/release gets its own stable catalog record.
- JSA is a top-level faction and is separate from NA2.
- Catalog data is stored separately from the user interface.
- Historical, OOP, limited, exclusive, and current models remain in the catalog.
- Images use explicit audit states: `unverified`, `candidate`, and `approved`.
- Once an image is approved or manually corrected, automated updates must not replace it unless an explicit override is supplied.

## Project structure

- `src/data/factions.js` — faction definitions
- `src/data/catalog.js` — sculpt/release database and image protection rules
- `src/components/SculptCard.jsx` — model display card
- `src/App.jsx` — main catalog interface
- `src/styles.css` — site design
- `src/main.jsx` — React entry point

## Development

```bash
npm install
npm run dev

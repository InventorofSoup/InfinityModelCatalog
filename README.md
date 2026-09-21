# Infinity Master Collection Tracker

An unofficial, fan-made web tracker for your **Infinity** (Corvus Belli) miniatures collection: all factions,
every sculpt, owned/quantity/painted status, and AVA warnings.

- Your collection is stored **in your own browser** (localStorage). Nothing is uploaded anywhere.
- Use **Export progress** (JSON, full backup) or **Export CSV** (spreadsheet-friendly) to back it up or move
  to another browser/device, and **Import progress** to load either format back in.

## Credits and disclaimer

**Infinity** and all related names, artwork, miniatures and product photographs are the property of
**Corvus Belli S.L.L.** All photos on this site are credited to Corvus Belli (sourced via
[Human Sphere](https://human-sphere.com)). The maintainer does not own the images and claims no rights to
them. This project is not affiliated with or endorsed by Corvus Belli. If you are a rights holder and would
like something removed, please open an issue and it will be taken down promptly.

## Publishing (maintainer notes)

The private catalog is generated locally from a source spreadsheet; `python build_public.py` writes the
public copy to `docs/` with all personal collection data blanked. GitHub Pages serves the `docs/` folder.

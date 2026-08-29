import { useMemo, useState } from "react";
import { factions } from "./data/factions.js";
import { catalog } from "./data/catalog.js";
import SculptCard from "./components/SculptCard.jsx";

export default function App() {
  const [factionId, setFactionId] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();

    return catalog.filter((record) => {
      const factionMatches =
        factionId === "all" || record.factionId === factionId;

      const searchMatches =
        !search ||
        [
          record.unitName,
          record.sculptName,
          record.releaseName,
          record.productCode,
          record.releaseState,
          ...(record.sectorials || []),
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      return factionMatches && searchMatches;
    });
  }, [factionId, query]);

  const selectedFaction =
    factionId === "all"
      ? null
      : factions.find((faction) => faction.id === factionId);

  return (
    <main className="site-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Corvus Belli Infinity archive</p>

          <h1>Infinity Model Vault</h1>

          <p className="subtitle">
            A sculpt-by-sculpt historical catalog of Infinity miniatures,
            from the earliest releases through current models.
          </p>
        </div>

        <div className="hero-stat">
          <strong>{catalog.length}</strong>
          <span>sculpts cataloged</span>
        </div>
      </header>

      <section className="controls">
        <input
          type="search"
          placeholder="Search unit, sculpt, product code, sectorial..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <select
          value={factionId}
          onChange={(event) => setFactionId(event.target.value)}
        >
          <option value="all">All factions</option>

          {factions.map((faction) => (
            <option key={faction.id} value={faction.id}>
              {faction.name}
            </option>
          ))}
        </select>
      </section>

      <nav className="faction-grid" aria-label="Infinity factions">
        <button
          className={factionId === "all" ? "active" : ""}
          type="button"
          onClick={() => setFactionId("all")}
        >
          All
        </button>

        {factions.map((faction) => (
          <button
            key={faction.id}
            className={factionId === faction.id ? "active" : ""}
            type="button"
            onClick={() => setFactionId(faction.id)}
          >
            {faction.name}
          </button>
        ))}
      </nav>

      <section className="catalog-heading">
        <div>
          <p className="eyebrow">Archive</p>

          <h2>
            {selectedFaction
              ? selectedFaction.name
              : "All miniatures"}
          </h2>
        </div>

        <span>
          {filtered.length} {filtered.length === 1 ? "record" : "records"}
        </span>
      </section>

      {filtered.length > 0 ? (
        <section className="sculpt-grid">
          {filtered.map((record) => (
            <SculptCard key={record.id} record={record} />
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <h3>Catalog structure is ready.</h3>

          <p>
            No audited sculpt records have been added to this view yet.
            We will populate the archive faction-by-faction after
            historical and image verification.
          </p>
        </section>
      )}
    </main>
  );
}

export const factions = [
  { id: "pan-oceania", name: "PanOceania" },
  { id: "yu-jing", name: "Yu Jing" },
  { id: "ariadna", name: "Ariadna" },
  { id: "haqqislam", name: "Haqqislam" },
  { id: "nomads", name: "Nomads" },
  { id: "combined-army", name: "Combined Army" },
  { id: "aleph", name: "ALEPH" },
  { id: "o-12", name: "O-12" },

  // JSA is intentionally its own top-level faction.
  { id: "jsa", name: "JSA" },

  { id: "na2", name: "NA2" },
  { id: "tohaa", name: "Tohaa" }
];

export function getFaction(factionId) {
  return factions.find((faction) => faction.id === factionId);
}

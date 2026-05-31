/**
 * Keywords used to heuristically flag a cargo description as dangerous goods.
 * Used as a fallback when a ship has no explicit `dangerousCargo` flag.
 */
export const DANGEROUS_CARGO_KEYWORDS = [
  "gevaarlijk",
  "hazard",
  "chemical",
  "chemicali",
  "olie",
  "oil",
  "benzine",
  "diesel",
  "brandstof",
  "fuel",
  "gas",
  "lng",
  "lpg",
  "ammonia",
  "explos",
  "radioact",
  "zuur",
  "acid",
  "toxic",
  "giftig",
];

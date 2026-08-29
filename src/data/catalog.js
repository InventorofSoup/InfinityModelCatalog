// Infinity Model Vault — canonical miniature catalog.
//
// IMPORTANT:
// One physical sculpt/release = one catalog record.
// Do not collapse multiple sculpts into a single unit record.
//
// Images must be audited. Once an image is APPROVED, automated
// catalog updates cannot replace it unless an explicit override
// is deliberately supplied.

export const IMAGE_STATES = Object.freeze({
  UNVERIFIED: "unverified",
  CANDIDATE: "candidate",
  APPROVED: "approved",
});

export const RELEASE_STATES = Object.freeze({
  CURRENT: "current",
  OOP: "oop",
  LIMITED: "limited",
  EXCLUSIVE: "exclusive",
  UNKNOWN: "unknown",
});

export const SOURCE_TYPES = Object.freeze({
  HUMAN_SPHERE: "Human Sphere",
  CORVUS_BELLI: "Corvus Belli",
  OTHER: "Other verified source",
});

// Creates a standardized record for one specific physical sculpt.
export function createSculpt(overrides = {}) {
  const base = {
    // Permanent catalog identifier.
    // Once assigned to a sculpt, this ID should never be reused.
    id: "",

    // Faction structure.
    factionId: "",
    sectorials: [],

    // Miniature identity.
    unitName: "",
    sculptName: "",
    releaseName: "",
    productCode: "",

    // Historical information.
    releaseYear: null,
    discontinuedYear: null,
    releaseState: RELEASE_STATES.UNKNOWN,

    // Physical information.
    material: "",
    baseSize: "",

    // Collector information.
    notes: "",

    // Historical references used to verify this sculpt.
    sources: [],

    // Canonical catalog image.
    image: {
      url: "",
      sourceUrl: "",
      state: IMAGE_STATES.UNVERIFIED,

      // Populated once the image is manually approved.
      approvedAt: "",
      approvedBy: "",

      // Optional fingerprint/hash for future image auditing.
      fingerprint: "",
    },
  };

  return {
    ...base,
    ...overrides,
    image: {
      ...base.image,
      ...(overrides.image || {}),
    },
  };
}

// Protects manually approved catalog images.
//
// Normal research/import processes may replace unverified or candidate
// images. An approved image is immutable unless explicitOverride=true.
export function canReplaceImage(
  existingImage,
  nextImage,
  explicitOverride = false
) {
  if (explicitOverride) {
    return true;
  }

  if (!existingImage?.url) {
    return true;
  }

  if (existingImage.state === IMAGE_STATES.APPROVED) {
    return existingImage.url === nextImage?.url;
  }

  return true;
}

// Marks an image as authoritative after manual review.
export function approveImage(image, approvedBy = "catalog-owner") {
  if (!image?.url) {
    throw new Error("An image cannot be approved without an image URL.");
  }

  return {
    ...image,
    state: IMAGE_STATES.APPROVED,
    approvedAt: new Date().toISOString(),
    approvedBy,
  };
}

// --------------------------------------------------------------------
// CANONICAL SCULPT DATABASE
// --------------------------------------------------------------------
//
// Do not add guessed records.
//
// Each record should be researched against Human Sphere first and then
// cross-checked where possible against Corvus Belli or another reliable
// historical/catalog source.
//
// Images remain UNVERIFIED until audited.
//
// Example structure:
//
// createSculpt({
//   id: "pan-oceania-example-001",
//   factionId: "pan-oceania",
//   sectorials: ["Military Orders"],
//   unitName: "Example Unit",
//   sculptName: "Example Unit — MULTI Rifle",
//   releaseName: "Example blister",
//   productCode: "280000-0000",
//   releaseYear: 2014,
//   discontinuedYear: 2019,
//   releaseState: RELEASE_STATES.OOP,
//   material: "Metal",
//   sources: [
//     {
//       type: SOURCE_TYPES.HUMAN_SPHERE,
//       url: "https://human-sphere.com/...",
//     },
//   ],
//   image: {
//     url: "",
//     sourceUrl: "",
//     state: IMAGE_STATES.UNVERIFIED,
//   },
// });

export const catalog = [];

// Wolf Types: the style quiz's five results. The stored keys (BUILDER, ALPHA…) stay as they are
// in the database; only what people read changed. Everything here is about tees, because tees
// are all VelvetWolf makes.
export const WOLF_TYPES = {
  BUILDER: {
    name: "Midnight Minimalist",
    line: "Clean lines, quiet colour, nothing extra.",
    story: "You choose weight and cut over logos. A plain tee in the right colour does more for you than any graphic.",
    look: "Tonal and plain tees in Noir and Bone, heavyweight cotton, a clean oversized line.",
  },
  SHADOW: {
    name: "Silent Hunter",
    line: "Noticed slowly, remembered long.",
    story: "Dark tones, a dropped shoulder and no loud branding. People ask where it's from.",
    look: "Noir and Forest, small or back-only prints, a relaxed drape.",
  },
  CREATOR: {
    name: "Creative Maverick",
    line: "Your tee is a canvas.",
    story: "Bold artwork, unexpected colour, and designs of your own from the Studio.",
    look: "Full-colour prints, Bone and Sand as a base for art, one-off Studio pieces.",
  },
  ALPHA: {
    name: "Headliner",
    line: "Big graphic, high contrast.",
    story: "Your tee says it before you do. You like a print you can read from across the room.",
    look: "Large front and back prints, strong contrast, Crimson and Noir.",
  },
  REBEL: {
    name: "Urban Rebel",
    line: "Raw, loud, unfiltered.",
    story: "Statement prints and an oversized fit, worn your way.",
    look: "Graphic and type-led prints, Noir and Crimson, the roomiest size you can carry off.",
  },
};

export const wolfType = (key) => WOLF_TYPES[String(key || "").toUpperCase()] || null;

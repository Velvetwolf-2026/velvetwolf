// The fit twin: from someone's height and chest, their VelvetWolf size and how the sizes either
// side actually sit on them. Uses the same numbers as the size guide (help/content.js): the
// body chest ranges decide the size; the garment's chest and length describe how it sits.
import { SIZE_GUIDE } from "../gallery/help/content";

export const FIT_SIZES = SIZE_GUIDE.map((s) => s.id); // S..XXL

// a hem around the hip for this cut is about 41% of someone's height (72 cm on 175 cm)
const IDEAL_LENGTH = 0.41;

export function validBody({ height, chest }) {
  const h = Number(height), c = Number(chest);
  const errors = {};
  if (!(h >= 140 && h <= 210)) errors.height = "Enter your height in cm, between 140 and 210.";
  if (!(c >= 76 && c <= 140)) errors.chest = "Enter your chest in cm (all the way round), between 76 and 140.";
  return errors;
}

// the size whose body-chest range holds this chest; below S is S, above XXL is XXL
export function sizeForChest(chest) {
  const c = Number(chest);
  for (const s of SIZE_GUIDE) if (c < s.body[1]) return s.id;
  return SIZE_GUIDE[SIZE_GUIDE.length - 1].id;
}

const room = (cm) => (cm < 12 ? "close" : cm <= 22 ? "relaxed, as it's cut" : "roomy");

// how one size sits: room round the chest, and where the hem falls against the ideal length
export function howItSits(sizeId, { height, chest }) {
  const s = SIZE_GUIDE.find((x) => x.id === sizeId);
  if (!s) return null;
  const chestRoom = Math.round(s.garment.chest * 2 - Number(chest));
  const lengthDelta = Math.round(s.garment.length - Number(height) * IDEAL_LENGTH);
  const hem = Math.abs(lengthDelta) <= 2 ? "at your hip" : lengthDelta > 0 ? `${lengthDelta} cm below your hip` : `${-lengthDelta} cm above your hip`;
  return { size: s.id, chestRoom, feel: room(chestRoom), lengthDelta, hem, garment: s.garment };
}

// past fit feedback ("tight" / "right" / "roomy") nudges the size one way when it leans clearly
export function feedbackNudge(feedback = []) {
  const n = { tight: 0, right: 0, roomy: 0 };
  for (const f of feedback) if (n[f] !== undefined) n[f]++;
  const total = n.tight + n.right + n.roomy;
  if (total < 2) return 0;
  if (n.tight / total > 0.5) return 1;
  if (n.roomy / total > 0.5) return -1;
  return 0;
}

// Your size, and the pair to compare (your size and the one up, or the one down at XXL)
export function fitTwin(body, feedback = []) {
  if (Object.keys(validBody(body)).length) return null;
  const base = sizeForChest(body.chest);
  const nudge = feedbackNudge(feedback);
  const i = Math.max(0, Math.min(FIT_SIZES.length - 1, FIT_SIZES.indexOf(base) + nudge));
  const size = FIT_SIZES[i];
  const other = FIT_SIZES[i + 1] || FIT_SIZES[i - 1];
  return {
    size,
    nudged: nudge !== 0 ? (nudge > 0 ? "up" : "down") : null,
    compare: [howItSits(size, body), howItSits(other, body)].sort((a, b) => FIT_SIZES.indexOf(a.size) - FIT_SIZES.indexOf(b.size)),
  };
}

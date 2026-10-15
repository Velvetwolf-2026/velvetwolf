// Hands a file picked on the home page ("Upload your artwork") to the Studio across the route
// change. In memory only: a reload simply opens the Studio ready for an upload.
let pending = null;

export function handOffArtwork(file) {
  pending = file || null;
}

export function takeArtwork() {
  const f = pending;
  pending = null;
  return f;
}

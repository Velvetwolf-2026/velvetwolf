import { useContext, useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { AppContext } from "./AppContext";
import { useGallery } from "../gallery/galleryContext";
import { COLORWAYS, COLOR_ORDER, SIZES, STUDIO_PRICE, STUDIO_BOTH_SIDES } from "../gallery/data";
import { money } from "../gallery/galleryProducts";
import { uploadStudioFile, canvasToBlob, thumbnailOf } from "../utils/studioUpload";
import { bindDrag } from "../gallery/drag";
import {
  createCustomPrint,
  drawCustom,
  imageFit,
  DESIGNS,
} from "../gallery/three/prints";

const INKS = ["bone", "noir", "sand", "forest", "crimson"];
const MARKS = ["wordmark", "monogram", "horizon", "contour", "nocturne"];
const ACCEPT = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_MB = 8;

export default function CustomDesignPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { addToCart, showToast } = useContext(AppContext);
  const { engine } = useGallery();

  const dragRef = useRef(null);
  const printsRef = useRef({
    front: createCustomPrint("front"),
    back: createCustomPrint("back"),
  });

  const initialText = (searchParams.get("text") || "").slice(0, 60);

  const [color, setColor] = useState("noir");
  const [side, setSide] = useState("front");
  const [ink, setInk] = useState("bone");
  const [size, setSize] = useState("");
  const [guide, setGuide] = useState(true);
  const [busy, setBusy] = useState(false);

  const [sides, setSides] = useState({
    front: {
      mode: "text",
      text: initialText || "Say less.",
      font: "display",
      scale: 1,
      offset: 0,
      image: null,
      imageName: "",
      imageType: "",
      imageFile: null,
      artworkPath: "",
      oneInk: true,
      mark: "monogram",
    },
    back: {
      mode: "text",
      text: "",
      font: "display",
      scale: 1,
      offset: 0,
      image: null,
      imageName: "",
      imageType: "",
      imageFile: null,
      artworkPath: "",
      oneInk: true,
      mark: "monogram",
    },
  });

  const activeSideState = sides[side];

  // Update a single property on the active side
  const updateActiveSide = (patch) => {
    setSides((prev) => ({
      ...prev,
      [side]: { ...prev[side], ...patch },
    }));
  };

  // Bind 3D engine studio view
  useEffect(() => {
    if (!engine) return;
    engine.setView("studio", "studio");
    engine.face("studio", side);
    if (engine.studio) {
      engine.studio.setColor(COLORWAYS[color]?.hex || "#141416");
      engine.studio.setInk(COLORWAYS[ink]?.hex || "#E8E4DA");
    }
  }, [engine, side, color, ink]);

  // Bind drag-to-turn
  useEffect(() => {
    if (!dragRef.current || !engine) return;
    return bindDrag(dragRef.current, engine, "studio");
  }, [engine]);

  // Redraw prints whenever sides, color, ink, or guide changes
  useEffect(() => {
    if (!engine?.studio) return;
    const { front: pFront, back: pBack } = printsRef.current;

    // Front
    drawCustom(pFront, { ...sides.front, guide: guide && side === "front" });
    const fullFront = sides.front.mode === "image" && sides.front.image && !sides.front.oneInk;
    engine.studio.setPrint("front", pFront.texture, { fullColor: fullFront });

    // Back
    drawCustom(pBack, { ...sides.back, guide: guide && side === "back" });
    const fullBack = sides.back.mode === "image" && sides.back.image && !sides.back.oneInk;
    engine.studio.setPrint("back", pBack.texture, { fullColor: fullBack });

    engine.studio.setColor(COLORWAYS[color]?.hex || "#141416");
    engine.studio.setInk(COLORWAYS[ink]?.hex || "#E8E4DA");
  }, [engine, sides, color, ink, guide, side]);

  // Switch camera face on side toggle
  const handleSideChange = (newSide) => {
    setSide(newSide);
    if (engine) engine.face("studio", newSide);
  };

  const handleColorChange = (newColor) => {
    setColor(newColor);
    if (engine?.studio) engine.studio.setColor(COLORWAYS[newColor]?.hex || "#141416");
  };

  const handleInkChange = (newInk) => {
    setInk(newInk);
    if (engine?.studio) engine.studio.setInk(COLORWAYS[newInk]?.hex || "#E8E4DA");
  };

  // File loading: keeps the original file (uploaded with the order) and shows it on the tee.
  const handleFile = (file) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      showToast("That file type can't be printed here. Use PNG, JPG, WebP or SVG.", "error");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      showToast(`That image is over ${MAX_MB} MB. Try a smaller file.`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        updateActiveSide({ mode: "image", image: img, imageName: file.name || "Pasted image", imageType: file.type, imageFile: file, artworkPath: "" });
        showToast(`${file.name || "Your image"} is on the ${side} of the tee`);
      };
      img.onerror = () => showToast("That file couldn't be read as an image. Try a PNG or JPG.", "error");
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Paste an image while the Studio is open.
  useEffect(() => {
    const onPaste = (e) => {
      if (e.target?.closest?.("textarea, input[type='text']")) return;
      const item = [...(e.clipboardData?.items || [])].find((it) => it.kind === "file" && it.type.startsWith("image/"));
      if (!item) return;
      e.preventDefault();
      handleFile(item.getAsFile());
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  });

  const isUsed = (sKey) => {
    const s = sides[sKey];
    return (
      (s.mode === "text" && s.text.trim().length > 0) ||
      (s.mode === "image" && Boolean(s.image)) ||
      s.mode === "mark"
    );
  };

  const bothSidesUsed = isUsed("front") && isUsed("back");
  const price = STUDIO_PRICE + (bothSidesUsed ? STUDIO_BOTH_SIDES : 0);

  // Quality check for upload
  let qualityText = "";
  let qualityLevel = "good";
  if (activeSideState.mode === "image" && activeSideState.image) {
    const fit = imageFit(side, activeSideState.image, activeSideState.scale);
    const isSvg = /svg/i.test(activeSideState.imageType || "");
    if (isSvg) {
      qualityText = "Vector artwork, prints ultra sharp.";
      qualityLevel = "good";
    } else if (fit.dpi >= 200) {
      qualityText = `~${Math.round(fit.cmW)} × ${Math.round(fit.cmH)} cm (${Math.round(fit.dpi)} DPI). Prints sharp.`;
      qualityLevel = "good";
    } else if (fit.dpi >= 150) {
      qualityText = `~${Math.round(fit.cmW)} × ${Math.round(fit.cmH)} cm (${Math.round(fit.dpi)} DPI). Prints fine.`;
      qualityLevel = "ok";
    } else {
      qualityText = `~${Math.round(fit.cmW)} × ${Math.round(fit.cmH)} cm (${Math.round(fit.dpi)} DPI). May print soft.`;
      qualityLevel = "low";
    }
  }

  // Uploads the artwork and a print proof of each used side, then adds the tee
  // to the cart. The server re-checks the design and sets the price.
  const handleAddToCart = async (e) => {
    e?.preventDefault();
    if (busy) return false;
    if (!size) {
      showToast("Select a size", "info");
      return false;
    }
    const used = ["front", "back"].filter(isUsed);
    if (!used.length) {
      showToast("Add some artwork first", "info");
      return false;
    }

    setBusy(true);
    try {
      const metaSides = {};
      let thumb = "";
      for (const name of used) {
        const sd = sides[name];
        let artwork = null;
        if (sd.mode === "image") {
          artwork = sd.artworkPath || (sd.imageFile ? await uploadStudioFile(sd.imageFile, "artwork") : null);
          if (!artwork) throw new Error("Upload your artwork again: the file is no longer available.");
          if (!sd.artworkPath) setSides((prev) => ({ ...prev, [name]: { ...prev[name], artworkPath: artwork } }));
        }
        // The proof is the print area exactly as designed, without the guide lines.
        const print = printsRef.current[name];
        drawCustom(print, { ...sd, guide: false });
        let proof = null;
        try {
          proof = await uploadStudioFile(await canvasToBlob(print.canvas), "proof");
        } catch (err) {
          console.warn("[studio] proof upload failed", err);
        }
        if (!thumb) thumb = thumbnailOf(print.canvas);
        drawCustom(print, { ...sd, guide: guide && name === side });
        metaSides[name] = {
          mode: sd.mode,
          text: sd.mode === "text" ? sd.text.trim() : "",
          font: sd.font,
          mark: sd.mode === "mark" ? sd.mark : null,
          artwork,
          artworkName: sd.mode === "image" ? sd.imageName : "",
          oneInk: sd.oneInk,
          scale: sd.scale,
          offset: sd.offset,
          proof,
        };
      }

      const summary = used.map((name) => {
        const sd = sides[name];
        const what = sd.mode === "text" ? `"${sd.text.trim().split("\n")[0].slice(0, 18)}"` : sd.mode === "image" ? "your artwork" : (DESIGNS[sd.mark]?.label || sd.mark).toLowerCase();
        return `${name} ${what}`;
      }).join(", ");

      const teeColor = COLORWAYS[color]?.site || "Black";
      const customItem = {
        id: `custom-studio-${Date.now()}`,
        name: `Custom tee (${summary})`.slice(0, 120),
        collection: "studio",
        price,
        originalPrice: price,
        image: thumb || "/mockup_silent.webp",
        sizes: [size],
        colors: [teeColor],
        stock: 99,
        isCustom: true,
        customMeta: { kind: "studio", color, ink, sides: metaSides },
      };
      await addToCart(customItem, size, teeColor, 1);
      return true;
    } catch (err) {
      showToast(err.message || "Something went wrong. Try again.", "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleBuyNow = async (e) => {
    e?.preventDefault();
    if (await handleAddToCart()) navigate("/checkout");
  };

  return (
    <main className="vwg vwg-view-pdp" style={{ minHeight: "100vh", position: "relative" }}>
      {/* 3D Stage Area */}
      <div className="vwg-stage-area">
        <div
          ref={dragRef}
          className="vwg-drag-surface"
          tabIndex={0}
          aria-label="Turn the tee. Use the left and right arrow keys or drag."
        />
        <p className="vwg-drag-hint">Drag to turn</p>
      </div>

      {/* Studio Vitrine Panel */}
      <aside className="vwg-panel" aria-label="Studio customization tools">
        <nav className="vwg-crumbs" aria-label="Breadcrumb">
          <span>Studio</span>
          <span aria-hidden="true">/</span>
          <span>Custom Piece</span>
        </nav>

        <header className="vwg-pdp-head">
          <h1 className="vwg-pdp-title">Make Your Own</h1>
          <div className="vwg-pdp-price-row">
            <span className="vwg-pdp-price">{money(price)}</span>
            <span className="vwg-status">
              <i></i>
              Made to order
            </span>
          </div>
          <p className="vwg-pdp-blurb">
            Your words or uploaded artwork, screen-printed or direct-to-garment on the same heavyweight combed cotton blank.
          </p>
        </header>

        <form className="vwg-pdp-form" onSubmit={handleAddToCart} noValidate>
          {/* Tee Colorway */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 10 }}>
            <legend style={{ display: "flex", justifyContent: "space-between", width: "100%", font: "600 11px/1.3 'Manrope', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E4DA" }}>
              <span>Tee Color</span>
              <span style={{ fontWeight: 500, letterSpacing: "0.04em", textTransform: "none", color: "rgba(232, 228, 218, 0.6)" }}>
                {COLORWAYS[color]?.name} {COLORWAYS[color]?.hex}
              </span>
            </legend>
            <div className="vwg-swatches">
              {COLOR_ORDER.map((id) => (
                <label key={id} className="vwg-swatch" title={COLORWAYS[id]?.name}>
                  <input
                    type="radio"
                    name="studio-color"
                    value={id}
                    checked={color === id}
                    onChange={() => handleColorChange(id)}
                  />
                  <span style={{ background: COLORWAYS[id]?.hex }}></span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Print Side Toggle */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 10 }}>
            <legend style={{ display: "flex", justifyContent: "space-between", width: "100%", font: "600 11px/1.3 'Manrope', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E4DA" }}>
              <span>Print Side</span>
              <span style={{ fontWeight: 500, letterSpacing: "0.04em", textTransform: "none", color: "rgba(232, 228, 218, 0.6)" }}>
                {side === "front" ? "Editing Front" : "Editing Back"}
              </span>
            </legend>
            <div className="vwg-seg">
              <label>
                <input
                  type="radio"
                  name="studio-side"
                  value="front"
                  checked={side === "front"}
                  onChange={() => handleSideChange("front")}
                />
                <span>Front</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="studio-side"
                  value="back"
                  checked={side === "back"}
                  onChange={() => handleSideChange("back")}
                />
                <span>Back</span>
              </label>
            </div>
          </fieldset>

          {/* Artwork Mode Switcher */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 10 }}>
            <legend style={{ font: "600 11px/1.3 'Manrope', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E4DA" }}>
              Artwork Type
            </legend>
            <div className="vwg-seg vwg-seg-3">
              <label>
                <input
                  type="radio"
                  name="studio-mode"
                  value="text"
                  checked={activeSideState.mode === "text"}
                  onChange={() => updateActiveSide({ mode: "text" })}
                />
                <span>Text</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="studio-mode"
                  value="image"
                  checked={activeSideState.mode === "image"}
                  onChange={() => updateActiveSide({ mode: "image" })}
                />
                <span>Upload</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="studio-mode"
                  value="mark"
                  checked={activeSideState.mode === "mark"}
                  onChange={() => updateActiveSide({ mode: "mark" })}
                />
                <span>Our Marks</span>
              </label>
            </div>

            {/* Mode: Text */}
            {activeSideState.mode === "text" && (
              <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
                <label style={{ fontSize: 11, font: "600 11px/1 'Manrope', sans-serif", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(232, 228, 218, 0.7)" }}>
                  Custom Text (Up to 3 lines)
                </label>
                <textarea
                  rows={2}
                  maxLength={60}
                  spellCheck="false"
                  value={activeSideState.text}
                  onChange={(e) => updateActiveSide({ text: e.target.value })}
                  style={{
                    width: "100%",
                    background: "rgba(24, 24, 27, 0.6)",
                    border: "1px solid rgba(232, 228, 218, 0.2)",
                    borderRadius: 2,
                    padding: "10px 12px",
                    color: "#E8E4DA",
                    fontFamily: activeSideState.font === "display" ? "var(--font-display, 'Unbounded')" : "var(--font-body, 'Manrope')",
                    fontSize: 14,
                    resize: "vertical",
                  }}
                  placeholder="Type your phrase..."
                />
                <label style={{ fontSize: 11, font: "600 11px/1 'Manrope', sans-serif", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(232, 228, 218, 0.7)" }}>
                  Typeface
                </label>
                <select
                  value={activeSideState.font}
                  onChange={(e) => updateActiveSide({ font: e.target.value })}
                  style={{
                    background: "rgba(24, 24, 27, 0.6)",
                    border: "1px solid rgba(232, 228, 218, 0.2)",
                    borderRadius: 2,
                    padding: "8px 10px",
                    color: "#E8E4DA",
                    fontFamily: "var(--font-body, 'Manrope')",
                  }}
                >
                  <option value="display">Unbounded (Wide Display)</option>
                  <option value="body">Manrope (Clean Body)</option>
                </select>
              </div>
            )}

            {/* Mode: Upload */}
            {activeSideState.mode === "image" && (
              <div style={{ display: "grid", gap: 10, marginTop: 4 }}>
                <div
                  className="vwg-dropzone"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("is-over"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("is-over")}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.remove("is-over");
                    handleFile(e.dataTransfer.files[0]);
                  }}
                >
                  {!activeSideState.image ? (
                    <div className="vwg-drop-empty">
                      <span style={{ font: "600 11px/1 'Manrope', sans-serif", letterSpacing: "0.18em", textTransform: "uppercase" }}>
                        Upload your artwork
                      </span>
                      <span style={{ fontSize: 12, color: "rgba(232, 228, 218, 0.6)", lineHeight: 1.4 }}>
                        Drag a file here, paste it, or choose one. PNG, JPG, WebP or SVG, up to 8 MB. A PNG with a transparent background prints cleanest.
                      </span>
                      <label className="vwg-btn-primary" style={{ display: "inline-grid", placeItems: "center", minHeight: 36, padding: "0 16px", cursor: "pointer", width: "auto" }}>
                        Choose File
                        <input
                          type="file"
                          accept={ACCEPT.join(",")}
                          style={{ display: "none" }}
                          onChange={(e) => handleFile(e.target.files[0])}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="vwg-drop-file">
                      <div className="vwg-drop-thumb">
                        <img src={activeSideState.image.src} alt="Upload proof" />
                      </div>
                      <div style={{ display: "grid", gap: 4 }}>
                        <span style={{ fontSize: 13, color: "#E8E4DA", overflowWrap: "anywhere" }}>
                          {activeSideState.imageName}
                        </span>
                        <span style={{ fontSize: 12, color: qualityLevel === "good" ? "#8FA88F" : qualityLevel === "ok" ? "#C9B99B" : "#C26A4A" }}>
                          ● {qualityText}
                        </span>
                        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                          <label style={{ fontSize: 11, textDecoration: "underline", cursor: "pointer", color: "#E8E4DA" }}>
                            Replace
                            <input
                              type="file"
                              accept={ACCEPT.join(",")}
                              style={{ display: "none" }}
                              onChange={(e) => handleFile(e.target.files[0])}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => updateActiveSide({ image: null, imageName: "", imageType: "", imageFile: null, artworkPath: "" })}
                            style={{ background: "none", border: 0, padding: 0, fontSize: 11, textDecoration: "underline", color: "rgba(232, 228, 218, 0.6)", cursor: "pointer" }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "rgba(232, 228, 218, 0.8)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={activeSideState.oneInk}
                    onChange={(e) => updateActiveSide({ oneInk: e.target.checked })}
                  />
                  <span>Print in single ink (monochrome). Untick for full color.</span>
                </label>
              </div>
            )}

            {/* Mode: Marks */}
            {activeSideState.mode === "mark" && (
              <div className="vwg-marks" style={{ marginTop: 4 }}>
                {MARKS.map((m) => (
                  <label key={m} className="vwg-mark">
                    <input
                      type="radio"
                      name="studio-mark"
                      value={m}
                      checked={activeSideState.mark === m}
                      onChange={() => updateActiveSide({ mark: m })}
                    />
                    <span>{DESIGNS[m]?.label || m}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {/* Ink color picker (when not full color) */}
          {!(activeSideState.mode === "image" && activeSideState.image && !activeSideState.oneInk) && (
            <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 10 }}>
              <legend style={{ display: "flex", justifyContent: "space-between", width: "100%", font: "600 11px/1.3 'Manrope', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E4DA" }}>
                <span>Ink Color</span>
                <span style={{ fontWeight: 500, letterSpacing: "0.04em", textTransform: "none", color: "rgba(232, 228, 218, 0.6)" }}>
                  {COLORWAYS[ink]?.name}
                </span>
              </legend>
              <div className="vwg-swatches">
                {INKS.map((id) => (
                  <label key={id} className="vwg-swatch" title={`${COLORWAYS[id]?.name} ink`}>
                    <input
                      type="radio"
                      name="studio-ink"
                      value={id}
                      checked={ink === id}
                      onChange={() => handleInkChange(id)}
                    />
                    <span style={{ background: COLORWAYS[id]?.hex }}></span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Placement: Scale and Offset */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 12 }}>
            <legend style={{ font: "600 11px/1.3 'Manrope', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E4DA" }}>
              Placement
            </legend>
            <div style={{ display: "grid", gridTemplateColumns: "4.5em 1fr 3.5em", alignItems: "center", gap: 12, fontSize: 13 }}>
              <label>Scale</label>
              <input
                type="range"
                min="50"
                max="150"
                value={Math.round(activeSideState.scale * 100)}
                onChange={(e) => updateActiveSide({ scale: Number(e.target.value) / 100 })}
              />
              <span style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {Math.round(activeSideState.scale * 100)}%
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "4.5em 1fr 3.5em", alignItems: "center", gap: 12, fontSize: 13 }}>
              <label>Height</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={Math.round(activeSideState.offset * 100)}
                onChange={(e) => updateActiveSide({ offset: Number(e.target.value) / 100 })}
              />
              <span style={{ textAlign: "right", fontSize: 12 }}>
                {activeSideState.offset > 0.35 ? "High" : activeSideState.offset < -0.35 ? "Low" : "Chest"}
              </span>
            </div>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, color: "rgba(232, 228, 218, 0.7)", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={guide}
                onChange={(e) => setGuide(e.target.checked)}
              />
              <span>Show print area boundaries</span>
            </label>
          </fieldset>

          {/* Size Selection */}
          <fieldset style={{ margin: 0, padding: 0, border: 0, display: "grid", gap: 10 }}>
            <legend style={{ font: "600 11px/1.3 'Manrope', sans-serif", letterSpacing: "0.2em", textTransform: "uppercase", color: "#E8E4DA" }}>
              Tee Size
            </legend>
            <div className="vwg-sizes">
              {SIZES.map((s) => (
                <label key={s.id} className="vwg-size">
                  <input
                    type="radio"
                    name="studio-size"
                    value={s.id}
                    checked={size === s.id}
                    onChange={(e) => setSize(e.target.value)}
                  />
                  <span>
                    <b>{s.id}</b>
                    <small>{s.chest} cm</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* CTAs */}
          <div style={{ display: "grid", gap: 10 }}>
            <button
              className="vwg-btn-primary"
              type="submit"
              disabled={busy || !size || (!isUsed("front") && !isUsed("back"))}
            >
              {busy
                ? "Uploading your design…"
                : !isUsed("front") && !isUsed("back")
                ? "Add some artwork first"
                : !size
                ? "Select a size"
                : `Add to cart · ${money(price)}`}
            </button>
            <button
              type="button"
              className="vwg-btn-primary"
              style={{ background: "transparent", border: "1px solid rgba(232, 228, 218, 0.3)", color: "#E8E4DA" }}
              disabled={busy || !size || (!isUsed("front") && !isUsed("back"))}
              onClick={handleBuyNow}
            >
              Buy now
            </button>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "rgba(232, 228, 218, 0.5)" }}>
            <button
              type="button"
              onClick={() => updateActiveSide({ text: "", image: null, imageName: "", imageType: "", imageFile: null, artworkPath: "" })}
              style={{ background: "none", border: 0, padding: 0, color: "inherit", textDecoration: "underline", cursor: "pointer" }}
            >
              Clear this side
            </button>
            {bothSidesUsed && (
              <span>Front + Back print (+{money(STUDIO_BOTH_SIDES)})</span>
            )}
          </div>
        </form>
      </aside>
    </main>
  );
}

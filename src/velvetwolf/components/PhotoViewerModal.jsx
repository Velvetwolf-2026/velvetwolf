import { useEffect, useRef } from "react";

export default function PhotoViewerModal({
  photos = [],
  currentIndex = 0,
  isOpen = false,
  onClose,
  onIndexChange,
}) {
  const dialogRef = useRef(null);
  const touchStartX = useRef(null);

  const total = photos.length;
  const currentPhoto = photos[currentIndex] || photos[0];

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose?.();
      } else if (e.key === "ArrowLeft" && total > 1) {
        e.preventDefault();
        onIndexChange?.((currentIndex - 1 + total) % total);
      } else if (e.key === "ArrowRight" && total > 1) {
        e.preventDefault();
        onIndexChange?.((currentIndex + 1) % total);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, total, onClose, onIndexChange]);

  if (!isOpen || !currentPhoto) return null;

  const handlePointerDown = (e) => {
    touchStartX.current = e.clientX;
  };

  const handlePointerUp = (e) => {
    if (touchStartX.current === null) return;
    const diff = e.clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(diff) > 40 && total > 1) {
      if (diff > 0) {
        onIndexChange?.((currentIndex - 1 + total) % total);
      } else {
        onIndexChange?.((currentIndex + 1) % total);
      }
    }
  };

  return (
    <div
      ref={dialogRef}
      className="vwg-viewer-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        backgroundColor: "rgba(6, 6, 7, 0.96)",
        display: "grid",
        placeItems: "center",
        color: "var(--bone, #E8E4DA)",
        padding: "env(safe-area-inset-top, 20px) 16px env(safe-area-inset-bottom, 24px)",
      }}
    >
      {/* Close button */}
      <button
        type="button"
        className="icon-btn vwg-viewer-close"
        aria-label="Close viewer"
        onClick={onClose}
        style={{
          position: "fixed",
          top: "max(16px, env(safe-area-inset-top, 16px))",
          right: "max(16px, env(safe-area-inset-right, 16px))",
          width: 44,
          height: 44,
          background: "rgba(10, 10, 11, 0.75)",
          border: "1px solid rgba(232, 228, 218, 0.2)",
          color: "var(--bone, #E8E4DA)",
          fontSize: 18,
          cursor: "pointer",
          display: "grid",
          placeItems: "center",
          borderRadius: 2,
          zIndex: 9001,
        }}
      >
        ✕
      </button>

      {/* Prev button */}
      {total > 1 && (
        <button
          type="button"
          className="icon-btn vwg-viewer-prev"
          aria-label="Previous photo"
          onClick={() => onIndexChange?.((currentIndex - 1 + total) % total)}
          style={{
            position: "fixed",
            left: "max(16px, env(safe-area-inset-left, 16px))",
            top: "50%",
            transform: "translateY(-50%)",
            width: 44,
            height: 44,
            background: "rgba(10, 10, 11, 0.75)",
            border: "1px solid rgba(232, 228, 218, 0.2)",
            color: "var(--bone, #E8E4DA)",
            fontSize: 20,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            borderRadius: 2,
            zIndex: 9001,
          }}
        >
          ←
        </button>
      )}

      {/* Main photo figure */}
      <figure
        className="vwg-viewer-fig"
        style={{
          margin: 0,
          display: "grid",
          gap: 16,
          justifyItems: "center",
          maxWidth: "100%",
          touchAction: "pan-y",
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <img
          src={currentPhoto.src}
          alt={currentPhoto.alt || "Product view"}
          style={{
            maxWidth: "min(100%, 880px)",
            maxHeight: "calc(100dvh - 130px)",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            userSelect: "none",
            borderRadius: 2,
          }}
        />
        <figcaption
          style={{
            display: "flex",
            gap: 16,
            alignItems: "baseline",
            font: "600 11px/1 'Manrope', sans-serif",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--bone, #E8E4DA)",
          }}
        >
          <span>{currentPhoto.color || "Product"}</span>
          <span style={{ color: "rgba(232, 228, 218, 0.5)", fontWeight: 500, letterSpacing: "0.04em", textTransform: "none" }}>
            {currentIndex + 1} of {total}
          </span>
        </figcaption>
      </figure>

      {/* Next button */}
      {total > 1 && (
        <button
          type="button"
          className="icon-btn vwg-viewer-next"
          aria-label="Next photo"
          onClick={() => onIndexChange?.((currentIndex + 1) % total)}
          style={{
            position: "fixed",
            right: "max(16px, env(safe-area-inset-right, 16px))",
            top: "50%",
            transform: "translateY(-50%)",
            width: 44,
            height: 44,
            background: "rgba(10, 10, 11, 0.75)",
            border: "1px solid rgba(232, 228, 218, 0.2)",
            color: "var(--bone, #E8E4DA)",
            fontSize: 20,
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            borderRadius: 2,
            zIndex: 9001,
          }}
        >
          →
        </button>
      )}
    </div>
  );
}

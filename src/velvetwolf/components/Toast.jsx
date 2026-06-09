import React, { useEffect } from "react";

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = { success: "#c9a84c", error: "#c0392b", info: "#4fc3f7" };

  return (
    <div className="toast" style={{ borderColor: colors[type] }}>
      <span style={{ color: colors[type], marginRight: 8 }}>
        {type === "success" ? "\u2713" : type === "error" ? "\u2715" : "i"}
      </span>
      {message}
    </div>
  );
}

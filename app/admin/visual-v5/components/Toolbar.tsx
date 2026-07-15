"use client";

import type { CSSProperties } from "react";

export type ViewMode = "pdf" | "iframe";
export type ToolMode = "select" | "text" | "choice" | "checkbox";

type ToolbarProps = {
  viewMode: ViewMode;
  activeTool: ToolMode;
  onChangeViewMode: (mode: ViewMode) => void;
  onChangeTool: (tool: ToolMode) => void;
  onSave: () => void;
};

export default function Toolbar({
  viewMode,
  activeTool,
  onChangeViewMode,
  onChangeTool,
  onSave,
}: ToolbarProps) {
  function choose(tool: ToolMode) {
    onChangeTool(tool);
    onChangeViewMode("pdf");
  }

  return (
    <div style={styles.toolbar}>
      <div style={styles.group}>
        <button
          type="button"
          style={activeTool === "select" ? styles.active : styles.button}
          onClick={() => choose("select")}
        >
          🖱 Mover
        </button>

        <button
          type="button"
          style={activeTool === "text" ? styles.active : styles.button}
          onClick={() => choose("text")}
        >
          ✏ Texto
        </button>

        <button
          type="button"
          style={activeTool === "choice" ? styles.active : styles.button}
          onClick={() => choose("choice")}
        >
          ⭕ Alternativa
        </button>

        <button
          type="button"
          style={activeTool === "checkbox" ? styles.active : styles.button}
          onClick={() => choose("checkbox")}
        >
          ☑ Checkbox
        </button>

        <button type="button" style={styles.save} onClick={onSave}>
          💾 Salvar
        </button>
      </div>

      <div style={styles.group}>
        <button
          type="button"
          style={viewMode === "pdf" ? styles.active : styles.button}
          onClick={() => onChangeViewMode("pdf")}
        >
          Modo Editor
        </button>

        <button
          type="button"
          style={viewMode === "iframe" ? styles.active : styles.button}
          onClick={() => onChangeViewMode("iframe")}
        >
          Compatibilidade
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  toolbar: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#fff",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  group: { display: "flex", gap: "8px", flexWrap: "wrap" },
  button: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  active: {
    border: "2px solid #2563eb",
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "10px",
    padding: "9px 11px",
    fontWeight: 800,
    cursor: "pointer",
  },
  save: {
    border: "1px solid #16a34a",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 800,
    cursor: "pointer",
  },
};

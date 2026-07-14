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
  function selectTool(tool: ToolMode) {
    onChangeTool(tool);

    if (viewMode !== "pdf") {
      onChangeViewMode("pdf");
    }
  }

  return (
    <div style={styles.toolbar}>
      <div style={styles.left}>
        <button
          type="button"
          style={
            activeTool === "select" ? styles.activeToolButton : styles.toolButton
          }
          onClick={() => selectTool("select")}
        >
          🖱 Selecionar
        </button>

        <button
          type="button"
          style={
            activeTool === "text" ? styles.activeToolButton : styles.toolButton
          }
          onClick={() => selectTool("text")}
        >
          □ Texto
        </button>

        <button
          type="button"
          style={
            activeTool === "choice" ? styles.activeToolButton : styles.toolButton
          }
          onClick={() => selectTool("choice")}
        >
          ⭕ Alternativa
        </button>

        <button
          type="button"
          style={
            activeTool === "checkbox"
              ? styles.activeToolButton
              : styles.toolButton
          }
          onClick={() => selectTool("checkbox")}
        >
          ☑ Checkbox
        </button>

        <button type="button" style={styles.saveButton} onClick={onSave}>
          💾 Salvar
        </button>
      </div>

      <div style={styles.right}>
        <button
          type="button"
          style={viewMode === "pdf" ? styles.activeButton : styles.modeButton}
          onClick={() => onChangeViewMode("pdf")}
        >
          Modo Editor
        </button>

        <button
          type="button"
          style={viewMode === "iframe" ? styles.activeButton : styles.modeButton}
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
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    marginTop: "24px",
    flexWrap: "wrap",
  },
  left: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  right: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  },
  toolButton: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  activeToolButton: {
    border: "2px solid #2563eb",
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "10px",
    padding: "9px 11px",
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.15)",
  },
  saveButton: {
    border: "1px solid #16a34a",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  modeButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  activeButton: {
    border: "1px solid #2563eb",
    background: "#dbeafe",
    color: "#1d4ed8",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 800,
    cursor: "pointer",
  },
};

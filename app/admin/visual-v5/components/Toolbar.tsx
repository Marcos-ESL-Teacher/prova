"use client";

import type { CSSProperties } from "react";

type ViewMode = "pdf" | "iframe";

type ToolbarProps = {
  viewMode: ViewMode;
  onChangeViewMode: (mode: ViewMode) => void;
};

export default function Toolbar({ viewMode, onChangeViewMode }: ToolbarProps) {
  return (
    <div style={styles.toolbar}>
      <div style={styles.left}>
        <button style={styles.toolButton}>🖱 Selecionar</button>
        <button style={styles.toolButton}>□ Texto</button>
        <button style={styles.toolButton}>⭕ Alternativa</button>
        <button style={styles.toolButton}>☑ Checkbox</button>
        <button style={styles.saveButton}>💾 Salvar</button>
      </div>

      <div style={styles.right}>
        <button
          style={viewMode === "pdf" ? styles.activeButton : styles.modeButton}
          onClick={() => onChangeViewMode("pdf")}
        >
          Modo Editor
        </button>

        <button
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
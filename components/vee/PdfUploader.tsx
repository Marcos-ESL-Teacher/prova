"use client";

import React from "react";

type Props = {
  fileName: string;
  onFileSelect: (file: File | null) => void;
};

export default function PdfUploader({ fileName, onFileSelect }: Props) {
  function handleFile(file: File | null) {
    if (!file) {
      onFileSelect(null);
      return;
    }

    if (file.type !== "application/pdf") {
      alert("Selecione apenas arquivos PDF.");
      return;
    }

    onFileSelect(file);
  }

  return (
    <label style={styles.box}>
      <input
        type="file"
        accept="application/pdf"
        onChange={(e) => handleFile(e.target.files?.[0] || null)}
        style={{ display: "none" }}
      />

      <div style={styles.icon}>📄</div>

      <strong style={styles.title}>
        {fileName ? "PDF selecionado" : "Clique para selecionar o PDF"}
      </strong>

      <p style={styles.subtitle}>
        {fileName || "Arquivo original da prova"}
      </p>
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  box: {
    display: "block",
    border: "2px dashed #93c5fd",
    background: "#eff6ff",
    borderRadius: "16px",
    padding: "24px",
    textAlign: "center",
    cursor: "pointer",
    marginBottom: "14px",
  },
  icon: {
    fontSize: "34px",
    marginBottom: "8px",
  },
  title: {
    display: "block",
    color: "#1e3a8a",
    fontSize: "16px",
  },
  subtitle: {
    margin: "6px 0 0 0",
    color: "#475569",
    fontSize: "14px",
  },
};
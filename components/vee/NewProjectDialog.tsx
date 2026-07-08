"use client";

import React from "react";
import PdfUploader from "./PdfUploader";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreate: (project: {
    collection: string;
    book: string;
    chapter: string;
    name: string;
    fileName: string;
  }) => void;
};

export default function NewProjectDialog({ open, onClose, onCreate }: Props) {
  const [collection, setCollection] = React.useState("");
  const [book, setBook] = React.useState("");
  const [chapter, setChapter] = React.useState("");
  const [name, setName] = React.useState("");
  const [fileName, setFileName] = React.useState("");

  if (!open) return null;

  function handleCreate() {
    if (!name.trim()) {
      alert("Digite o nome da prova.");
      return;
    }

    onCreate({ collection, book, chapter, name, fileName });

    setCollection("");
    setBook("");
    setChapter("");
    setName("");
    setFileName("");
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Novo Projeto Visual</h2>

        <input
          style={styles.input}
          placeholder="Coleção. Ex: Side by Side Plus"
          value={collection}
          onChange={(e) => setCollection(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Livro. Ex: SBS Book 2 Plus"
          value={book}
          onChange={(e) => setBook(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Capítulo / Unidade. Ex: Chapter 8"
          value={chapter}
          onChange={(e) => setChapter(e.target.value)}
        />

        <input
          style={styles.input}
          placeholder="Nome da prova. Ex: Classroom Test"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <PdfUploader
          fileName={fileName}
          onFileSelect={(file) => setFileName(file?.name || "")}
        />

        <div style={styles.actions}>
          <button style={styles.cancel} onClick={onClose}>
            Cancelar
          </button>

          <button style={styles.create} onClick={handleCreate}>
            Criar Projeto
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  modal: {
    width: "520px",
    background: "#ffffff",
    borderRadius: "18px",
    padding: "28px",
  },
  title: {
    marginTop: 0,
    marginBottom: "18px",
    color: "#0f172a",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    fontSize: "15px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "18px",
  },
  cancel: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    cursor: "pointer",
  },
  create: {
    padding: "12px 16px",
    borderRadius: "10px",
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: 700,
    cursor: "pointer",
  },
};
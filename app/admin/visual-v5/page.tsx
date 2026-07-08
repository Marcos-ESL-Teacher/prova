"use client";

import type React from "react";
import { useState } from "react";
import NewProjectDialog from "../../../components/vee/NewProjectDialog";

type Project = {
  id: string;
  collection: string;
  book: string;
  chapter: string;
  name: string;
  fileName: string;
};

export default function VisualV5Page() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  function handleCreate(project: Omit<Project, "id">) {
    setProjects((prev) => [
      {
        id: String(Date.now()),
        ...project,
      },
      ...prev,
    ]);

    setDialogOpen(false);
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <p style={styles.badge}>VEE 1.0</p>
          <h1 style={styles.title}>Visual Exam Engine</h1>
          <p style={styles.subtitle}>
            Novo módulo visual para transformar PDFs em provas digitais.
          </p>
        </div>

        <button style={styles.primaryButton} onClick={() => setDialogOpen(true)}>
          + Novo Projeto
        </button>
      </section>

      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Projetos Visuais</h2>

        {projects.length === 0 ? (
          <p style={styles.empty}>Nenhum projeto criado ainda.</p>
        ) : (
          <div style={styles.projectList}>
            {projects.map((project) => (
              <div key={project.id} style={styles.projectCard}>
                <strong>{project.name}</strong>
                <p>
                  {project.collection} — {project.book} {project.chapter}
                </p>
                <small>{project.fileName || "PDF ainda não selecionado"}</small>
              </div>
            ))}
          </div>
        )}
      </section>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={handleCreate}
      />
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "32px",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    maxWidth: "1100px",
    margin: "0 auto 24px auto",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "28px",
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    alignItems: "center",
    boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
  },
  badge: {
    display: "inline-block",
    margin: "0 0 8px 0",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 700,
  },
  title: {
    margin: 0,
    fontSize: "34px",
    color: "#0f172a",
  },
  subtitle: {
    margin: "8px 0 0 0",
    color: "#64748b",
    fontSize: "16px",
  },
  primaryButton: {
    border: "none",
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: "12px",
    padding: "14px 18px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  card: {
    maxWidth: "1100px",
    margin: "0 auto",
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "18px",
    padding: "28px",
  },
  cardTitle: {
    margin: 0,
    fontSize: "22px",
    color: "#0f172a",
  },
  empty: {
    marginTop: "18px",
    padding: "28px",
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "14px",
    color: "#64748b",
    textAlign: "center",
  },
  projectList: {
    display: "grid",
    gap: "14px",
    marginTop: "18px",
  },
  projectCard: {
    padding: "18px",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    background: "#f8fafc",
  },
};
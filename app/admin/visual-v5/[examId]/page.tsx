"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { veeStyles as styles } from "../styles";
import { getOrCreateProject, updateProjectPdf } from "../lib/db";
import { getVeePdfUrl, uploadVeePdf } from "../lib/storage";
import type { VeeProject } from "../types";
import PdfCanvas from "../components/PdfCanvas";
import Toolbar, {
  type ToolMode,
  type ViewMode,
} from "../components/Toolbar";

export default function VisualV5ExamPage() {
  const params = useParams();
  const examId = String(params.examId || "");

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [project, setProject] = useState<VeeProject | null>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("pdf");
  const [activeTool, setActiveTool] = useState<ToolMode>("select");
  const [saveRequest, setSaveRequest] = useState(0);

  useEffect(() => {
    async function loadProject() {
      try {
        setLoading(true);
        setErrorMessage("");
        setMessage("");

        const data = await getOrCreateProject(examId);
        setProject(data);

        if (data?.pdf_path) {
          setPdfUrl(await getVeePdfUrl(data.pdf_path));
        }
      } catch (error: any) {
        setErrorMessage(error?.message || "Erro ao abrir projeto VEE.");
      } finally {
        setLoading(false);
      }
    }

    if (examId) void loadProject();
  }, [examId]);

  async function handlePdfUpload(file: File | null) {
    if (!file || !project) return;

    if (file.type !== "application/pdf") {
      alert("Selecione apenas arquivo PDF.");
      return;
    }

    try {
      setUploading(true);
      setErrorMessage("");
      setMessage("Enviando PDF...");

      const pdfPath = await uploadVeePdf(project.id, file);
      const updatedProject = await updateProjectPdf(project.id, pdfPath);

      setProject(updatedProject);
      setPdfUrl(await getVeePdfUrl(pdfPath));
      setViewMode("pdf");
      setActiveTool("select");
      setMessage("PDF enviado com sucesso.");
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao enviar PDF.");
      setMessage("");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <span style={styles.badge}>VEE 1.0</span>
        <h1 style={styles.title}>Editor Visual VEE</h1>
        <p style={styles.subtitle}>Prova vinculada: {examId}</p>
      </section>

      <section style={styles.card}>
        {loading && <p>Carregando projeto visual...</p>}

        {!loading && errorMessage && (
          <p style={{ color: "#dc2626", fontWeight: 700 }}>
            {errorMessage}
          </p>
        )}

        {!loading && project && (
          <>
            <h2 style={{ marginTop: 0 }}>Projeto VEE aberto ✅</h2>

            <p><strong>Project ID:</strong> {project.id}</p>
            <p><strong>Status:</strong> {project.status}</p>
            <p><strong>PDF:</strong> {project.pdf_path || "Ainda não enviado"}</p>

            <div style={uploadBox}>
              <h3>Enviar PDF original da prova</h3>

              <input
                type="file"
                accept="application/pdf"
                disabled={uploading}
                onChange={(event) =>
                  handlePdfUpload(event.target.files?.[0] || null)
                }
              />

              {uploading && <p>Enviando...</p>}

              {message && (
                <p style={{ color: "#166534", fontWeight: 700 }}>
                  {message}
                </p>
              )}
            </div>

            {pdfUrl && (
              <>
                <Toolbar
                  viewMode={viewMode}
                  activeTool={activeTool}
                  onChangeViewMode={setViewMode}
                  onChangeTool={(tool) => {
                    setActiveTool(tool);
                    setViewMode("pdf");
                  }}
                  onSave={() => setSaveRequest((value) => value + 1)}
                />

                <div style={helpBox}>
                  {activeTool === "select" &&
                    "🖱 Mover: clique, segure e arraste uma caixa azul. Este modo nunca cria caixas."}
                  {activeTool === "text" &&
                    "✏ Texto: clique na lacuna, informe o número da questão e o gabarito."}
                  {activeTool === "choice" &&
                    "⭕ Alternativa: clique ao lado da opção e informe questão, letra e se é correta."}
                  {activeTool === "checkbox" &&
                    "☑ Checkbox: clique ao lado da opção e informe questão, valor e se é correta."}
                </div>

                <div style={previewBox}>
                  {viewMode === "pdf" ? (
                    <PdfCanvas
                      pdfUrl={pdfUrl}
                      projectId={project.id}
                      activeTool={activeTool}
                      saveRequest={saveRequest}
                    />
                  ) : (
                    <iframe
                      src={pdfUrl}
                      style={iframeStyle}
                      title="PDF da prova"
                    />
                  )}
                </div>
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

const uploadBox: CSSProperties = {
  marginTop: "24px",
  padding: "18px",
  borderRadius: "14px",
  background: "#f8fafc",
  border: "1px dashed #93c5fd",
};

const helpBox: CSSProperties = {
  marginTop: "12px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e40af",
  fontWeight: 700,
};

const previewBox: CSSProperties = { marginTop: "24px" };

const iframeStyle: CSSProperties = {
  width: "100%",
  height: "720px",
  border: "1px solid #e5e7eb",
  borderRadius: "14px",
  background: "#ffffff",
};

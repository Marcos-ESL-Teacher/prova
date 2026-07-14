"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent } from "react";
import {
  getFieldsByProjectId,
  saveFieldsForProject,
  type VeeField,
} from "../lib/db";
import FieldLayer, { type FieldBoxData } from "./FieldLayer";

type PdfCanvasProps = {
  pdfUrl: string;
  projectId?: string;
};

const DEFAULT_FIELD_TYPE = "short_text";

export default function PdfCanvas({ pdfUrl, projectId }: PdfCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ xPercent: 0, yPercent: 0 });
  const didDragRef = useRef(false);

  const [pdf, setPdf] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [fields, setFields] = useState<FieldBoxData[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [dragFieldId, setDragFieldId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSavedFields() {
      if (!projectId) return;

      try {
        setStatusMessage("Carregando campos salvos...");

        const savedFields = await getFieldsByProjectId(projectId);

        const mappedFields: FieldBoxData[] = savedFields.map(
          (field: any, index: number) => ({
            id: field.id || String(Date.now() + index),
            dbId: field.id,
            page: Number(field.metadata?.page || 1),
            questionNumber: Number(field.question_number || index + 1),
            fieldType: field.field_type || DEFAULT_FIELD_TYPE,
            xPercent: Number(field.x || 0),
            yPercent: Number(field.y || 0),
            widthPercent: Number(field.width || 10),
            heightPercent: Number(field.height || 3),
          })
        );

        setFields(mappedFields);
        setSelectedFieldId(null);
        setStatusMessage(
          mappedFields.length > 0
            ? `Campos carregados: ${mappedFields.length}`
            : "Nenhum campo salvo ainda."
        );
      } catch (error: any) {
        setErrorMessage(error?.message || "Erro ao carregar campos.");
      }
    }

    loadSavedFields();
  }, [projectId]);

  useEffect(() => {
    async function loadPdf() {
      try {
        setLoading(true);
        setErrorMessage("");

        const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.mjs",
          import.meta.url
        ).toString();

        const loadedPdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;

        setPdf(loadedPdf);
        setNumPages(loadedPdf.numPages || 1);
        setPageNumber(1);
        setSelectedFieldId(null);
      } catch (error: any) {
        setErrorMessage(error?.message || "Erro ao carregar PDF.");
      } finally {
        setLoading(false);
      }
    }

    if (pdfUrl) loadPdf();
  }, [pdfUrl]);

  useEffect(() => {
    async function renderPage() {
      if (!pdf || !canvasRef.current || !containerRef.current) return;

      try {
        setLoading(true);
        setErrorMessage("");

        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });

        const containerWidth = containerRef.current.clientWidth || 900;
        const maxWidth = Math.min(containerWidth - 24, 1100);
        const scale = maxWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) return;

        const ratio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        context.clearRect(0, 0, viewport.width, viewport.height);

        await page.render({
          canvasContext: context,
          viewport,
        }).promise;

        setCanvasSize({
          width: viewport.width,
          height: viewport.height,
        });
      } catch (error: any) {
        setErrorMessage(error?.message || "Erro ao renderizar página.");
      } finally {
        setLoading(false);
      }
    }

    renderPage();

    window.addEventListener("resize", renderPage);

    return () => {
      window.removeEventListener("resize", renderPage);
    };
  }, [pdf, pageNumber]);

  function updateFieldPosition(
    fieldId: string,
    xPercent: number,
    yPercent: number
  ) {
    setFields((current) =>
      current.map((field) => {
        if (field.id !== fieldId) return field;

        const halfWidth = field.widthPercent / 2;
        const halfHeight = field.heightPercent / 2;

        return {
          ...field,
          xPercent: Number(
            Math.max(halfWidth, Math.min(100 - halfWidth, xPercent)).toFixed(3)
          ),
          yPercent: Number(
            Math.max(halfHeight, Math.min(100 - halfHeight, yPercent)).toFixed(3)
          ),
        };
      })
    );
  }

  function handleDragStart(
    fieldId: string,
    event: MouseEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    event.stopPropagation();

    const field = fields.find((item) => item.id === fieldId);
    const canvasWrap = canvasWrapRef.current;

    if (!field || !canvasWrap) return;

    const rect = canvasWrap.getBoundingClientRect();
    const pointerXPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerYPercent = ((event.clientY - rect.top) / rect.height) * 100;

    dragOffsetRef.current = {
      xPercent: pointerXPercent - field.xPercent,
      yPercent: pointerYPercent - field.yPercent,
    };

    didDragRef.current = false;
    setDragFieldId(fieldId);
    setSelectedFieldId(fieldId);
    setStatusMessage(`Movendo campo Q${field.questionNumber}...`);
  }

  function handleDragMove(event: MouseEvent<HTMLDivElement>) {
    if (!dragFieldId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const pointerXPercent = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerYPercent = ((event.clientY - rect.top) / rect.height) * 100;

    didDragRef.current = true;

    updateFieldPosition(
      dragFieldId,
      pointerXPercent - dragOffsetRef.current.xPercent,
      pointerYPercent - dragOffsetRef.current.yPercent
    );
  }

  function handleDragEnd() {
    if (!dragFieldId) return;

    const movedField = fields.find((field) => field.id === dragFieldId);

    setDragFieldId(null);

    if (didDragRef.current && movedField) {
      setStatusMessage(
        `Campo Q${movedField.questionNumber} movido. Clique em Salvar.`
      );
    }
  }

  function handleCanvasClick(event: MouseEvent<HTMLDivElement>) {
    if (!canvasSize.width || !canvasSize.height || dragFieldId) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    const nextQuestionNumber =
      fields.length > 0
        ? Math.max(...fields.map((field) => field.questionNumber)) + 1
        : 1;

    const newField: FieldBoxData = {
      id: String(Date.now()),
      page: pageNumber,
      questionNumber: nextQuestionNumber,
      fieldType: DEFAULT_FIELD_TYPE,
      xPercent: Number(xPercent.toFixed(3)),
      yPercent: Number(yPercent.toFixed(3)),
      widthPercent: 10,
      heightPercent: 3,
    };

    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
    setStatusMessage(`Campo Q${nextQuestionNumber} criado. Clique em Salvar.`);
  }

  function handleSelectField(fieldId: string) {
    setSelectedFieldId(fieldId);

    const selected = fields.find((field) => field.id === fieldId);

    if (selected) {
      setStatusMessage(`Campo Q${selected.questionNumber} selecionado.`);
    }
  }

  function deleteSelectedField() {
    if (!selectedFieldId) return;

    const selected = fields.find((field) => field.id === selectedFieldId);

    const confirmDelete = confirm(
      selected
        ? `Deseja excluir o campo Q${selected.questionNumber}? Depois clique em Salvar.`
        : "Deseja excluir o campo selecionado? Depois clique em Salvar."
    );

    if (!confirmDelete) return;

    setFields((prev) => prev.filter((field) => field.id !== selectedFieldId));
    setSelectedFieldId(null);
    setStatusMessage("Campo selecionado removido da tela. Clique em Salvar.");
  }

  function duplicateSelectedField() {
    if (!selectedFieldId) return;

    const selected = fields.find((field) => field.id === selectedFieldId);

    if (!selected) return;

    const nextQuestionNumber =
      fields.length > 0
        ? Math.max(...fields.map((field) => field.questionNumber)) + 1
        : 1;

    const duplicatedField: FieldBoxData = {
      ...selected,
      id: String(Date.now()),
      dbId: undefined,
      fieldType: selected.fieldType || DEFAULT_FIELD_TYPE,
      questionNumber: nextQuestionNumber,
      xPercent: Math.min(98, Number((selected.xPercent + 2).toFixed(3))),
      yPercent: Math.min(98, Number((selected.yPercent + 2).toFixed(3))),
    };

    setFields((prev) => [...prev, duplicatedField]);
    setSelectedFieldId(duplicatedField.id);
    setStatusMessage(
      `Campo duplicado como Q${nextQuestionNumber}. Clique em Salvar.`
    );
  }

  async function handleSaveFields() {
    if (!projectId) {
      setErrorMessage("Project ID não encontrado. Não foi possível salvar.");
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setStatusMessage("Salvando campos...");

      const rows: VeeField[] = fields.map((field, index) => ({
        project_id: projectId,
        page_id: null,
        question_number: field.questionNumber,
        field_type: field.fieldType || DEFAULT_FIELD_TYPE,
        label: `Q${field.questionNumber}`,
        answer_value: "",
        x: Number(field.xPercent.toFixed(3)),
        y: Number(field.yPercent.toFixed(3)),
        width: Number(field.widthPercent.toFixed(3)),
        height: Number(field.heightPercent.toFixed(3)),
        points: 1,
        required: true,
        sort_order: index + 1,
        metadata: {
          page: field.page,
        },
        is_deleted: false,
      }));

      const saved = await saveFieldsForProject(projectId, rows);

      const mappedFields: FieldBoxData[] = saved.map(
        (field: any, index: number) => ({
          id: field.id || String(Date.now() + index),
          dbId: field.id,
          page: Number(field.metadata?.page || 1),
          questionNumber: Number(field.question_number || index + 1),
          fieldType: field.field_type || DEFAULT_FIELD_TYPE,
          xPercent: Number(field.x || 0),
          yPercent: Number(field.y || 0),
          widthPercent: Number(field.width || 10),
          heightPercent: Number(field.height || 3),
        })
      );

      setFields(mappedFields);
      setSelectedFieldId(null);
      setStatusMessage(`Campos salvos com sucesso: ${mappedFields.length}`);
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao salvar campos.");
      setStatusMessage("");
    } finally {
      setSaving(false);
    }
  }

  function removeLastField() {
    setFields((prev) => prev.slice(0, -1));
    setSelectedFieldId(null);
    setStatusMessage("Último campo removido da tela. Clique em Salvar.");
  }

  function clearFields() {
    const confirmClear = confirm(
      "Deseja remover todos os campos da tela? Depois clique em Salvar para apagar no banco."
    );

    if (!confirmClear) return;

    setFields([]);
    setSelectedFieldId(null);
    setStatusMessage("Campos removidos da tela. Clique em Salvar.");
  }

  function goPrevious() {
    setPageNumber((current) => Math.max(1, current - 1));
    setSelectedFieldId(null);
  }

  function goNext() {
    setPageNumber((current) => Math.min(numPages, current + 1));
    setSelectedFieldId(null);
  }

  const visibleFields = fields.filter((field) => field.page === pageNumber);
  const selectedField = fields.find((field) => field.id === selectedFieldId);

  return (
    <div style={styles.container} ref={containerRef}>
      <div style={styles.controls}>
        <button
          style={styles.button}
          onClick={goPrevious}
          disabled={pageNumber <= 1}
        >
          ← Página anterior
        </button>

        <strong>
          Página {pageNumber}
          {numPages ? ` de ${numPages}` : ""}
        </strong>

        <button
          style={styles.button}
          onClick={goNext}
          disabled={!numPages || pageNumber >= numPages}
        >
          Próxima página →
        </button>
      </div>

      <div style={styles.actions}>
        <button
          style={styles.saveButton}
          onClick={handleSaveFields}
          disabled={saving || !projectId}
        >
          {saving ? "Salvando..." : "💾 Salvar campos"}
        </button>

        <button
          style={styles.secondaryButton}
          onClick={removeLastField}
          disabled={fields.length === 0 || saving}
        >
          ↩️ Remover último
        </button>

        <button
          style={styles.secondaryButton}
          onClick={duplicateSelectedField}
          disabled={!selectedFieldId || saving}
        >
          📋 Duplicar selecionado
        </button>

        <button
          style={styles.dangerButton}
          onClick={deleteSelectedField}
          disabled={!selectedFieldId || saving}
        >
          🗑️ Excluir selecionado
        </button>

        <button
          style={styles.dangerButton}
          onClick={clearFields}
          disabled={fields.length === 0 || saving}
        >
          🧹 Limpar tudo
        </button>
      </div>

      {selectedField && (
        <div style={styles.selectedInfo}>
          Campo selecionado: <strong>Q{selectedField.questionNumber}</strong>
        </div>
      )}

      {loading && <p>Carregando página...</p>}

      {statusMessage && (
        <p style={{ color: "#166534", fontWeight: 700 }}>{statusMessage}</p>
      )}

      {errorMessage && (
        <p style={{ color: "#dc2626", fontWeight: 700 }}>{errorMessage}</p>
      )}

      <div style={styles.stage}>
        <div
          ref={canvasWrapRef}
          style={{
            ...styles.canvasWrap,
            width: canvasSize.width || "auto",
            height: canvasSize.height || "auto",
            cursor: dragFieldId ? "grabbing" : "crosshair",
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <canvas ref={canvasRef} style={styles.canvas} />

          <FieldLayer
            fields={visibleFields}
            selectedFieldId={selectedFieldId}
            onSelectField={handleSelectField}
            onDragStart={handleDragStart}
          />
        </div>
      </div>

      <div style={styles.status}>
        <strong>Campos nesta página:</strong> {visibleFields.length}
        {" | "}
        <strong>Total no projeto:</strong> {fields.length}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: "100%",
    marginTop: "18px",
  },
  controls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
    flexWrap: "wrap",
  },
  actions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },
  button: {
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
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #64748b",
    background: "#f1f5f9",
    color: "#334155",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #dc2626",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "10px",
    padding: "10px 12px",
    fontWeight: 800,
    cursor: "pointer",
  },
  selectedInfo: {
    marginBottom: "12px",
    padding: "10px 12px",
    background: "#eff6ff",
    border: "1px solid #93c5fd",
    borderRadius: "10px",
    color: "#1e40af",
  },
  stage: {
    width: "100%",
    minHeight: "720px",
    overflow: "auto",
    background: "#e5e7eb",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    padding: "12px",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  canvasWrap: {
    position: "relative",
    background: "#ffffff",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.20)",
    cursor: "crosshair",
  },
  canvas: {
    display: "block",
  },
  status: {
    marginTop: "12px",
    padding: "12px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    color: "#334155",
  },
};
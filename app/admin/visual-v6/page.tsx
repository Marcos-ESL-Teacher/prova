"use client";

import {
  ChangeEvent,
  CSSProperties,
  MouseEvent,
  PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  getFieldsByProjectId,
  saveFieldsForProject,
  type VeeField,
} from "../visual-v5/lib/db";
import PropertiesPanel from "./components/PropertiesPanel";
import PdfLoader, {
  type LoadedProjectPdf,
} from "./components/PdfLoader";

type PdfState = {
  fileName: string;
  fileSize: number;
  objectUrl: string;
};

type VisualField = {
  id: string;
  page: number;
  questionNumber: number;
  fieldType: string;
  answerValue: string;
  points: number;
  required: boolean;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type ResizeDirection = "east" | "south" | "southeast";

type ResizeStart = {
  fieldId: string;
  direction: ResizeDirection;
  startClientX: number;
  startClientY: number;
  startWidthPercent: number;
  startHeightPercent: number;
  leftPercent: number;
  topPercent: number;
};

const DEFAULT_FIELD_TYPE = "short_text";

function formatFileSize(bytes: number) {
  if (bytes === 0) return "0 KB";

  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;

  return `${(kb / 1024).toFixed(2)} MB`;
}

export default function VisualV6Page() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement | null>(null);

  const [projectId, setProjectId] = useState("");
  const [pdfFile, setPdfFile] = useState<PdfState | null>(null);
  const [pdfDocument, setPdfDocument] = useState<any>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const [fields, setFields] = useState<VisualField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState(false);
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null);
  const [resizingFieldId, setResizingFieldId] = useState<string | null>(null);

  const dragOffset = useRef({
    x: 0,
    y: 0,
  });

  const resizeStart = useRef<ResizeStart | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingFields, setLoadingFields] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(
    "Informe o Project ID para carregar automaticamente o PDF e os campos."
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const value = params.get("projectId") || "";
    setProjectId(value);
  }, []);

  useEffect(() => {
    return () => {
      if (pdfFile?.objectUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pdfFile.objectUrl);
      }
    };
  }, [pdfFile]);

  useEffect(() => {
    async function loadSavedFields() {
      if (!projectId.trim()) {
        setFields([]);
        return;
      }

      try {
        setLoadingFields(true);
        setErrorMessage("");
        setMessage("Carregando campos salvos...");

        const savedFields = await getFieldsByProjectId(projectId.trim());

        const mappedFields: VisualField[] = savedFields.map(
          (field: any, index: number) => ({
            id: field.id || crypto.randomUUID(),
            page: Number(field.metadata?.page || 1),
            questionNumber: Number(field.question_number || index + 1),
            fieldType: field.field_type || DEFAULT_FIELD_TYPE,
            answerValue: field.answer_value || "",
            points: Number(field.points ?? 1),
            required: Boolean(field.required ?? true),
            xPercent: Number(field.x || 0),
            yPercent: Number(field.y || 0),
            widthPercent: Number(field.width || 10),
            heightPercent: Number(field.height || 3.2),
          })
        );

        setFields(mappedFields);
        setSelectedFieldId(null);
        setMessage(
          mappedFields.length
            ? `Campos carregados: ${mappedFields.length}`
            : "Nenhum campo salvo neste projeto."
        );
      } catch (error: any) {
        setErrorMessage(error?.message || "Erro ao carregar os campos.");
        setMessage("");
      } finally {
        setLoadingFields(false);
      }
    }

    loadSavedFields();
  }, [projectId]);

  useEffect(() => {
    async function loadPdf() {
      if (!pdfFile?.objectUrl) {
        setPdfDocument(null);
        setNumPages(0);
        setPageNumber(1);
        return;
      }

      try {
        setLoading(true);
        setErrorMessage("");
        setMessage("Carregando PDF...");

        const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/legacy/build/pdf.worker.mjs",
          import.meta.url
        ).toString();

        const loadedPdf = await pdfjsLib.getDocument({
          url: pdfFile.objectUrl,
        }).promise;

        setPdfDocument(loadedPdf);
        setNumPages(loadedPdf.numPages || 1);
        setPageNumber(1);
        setMessage(
          "PDF carregado. Clique em “Criar campo” e depois clique sobre a página."
        );
      } catch (error: any) {
        setErrorMessage(error?.message || "Erro ao carregar o PDF.");
        setMessage("");
      } finally {
        setLoading(false);
      }
    }

    loadPdf();
  }, [pdfFile]);

  useEffect(() => {
    async function renderPage() {
      if (!pdfDocument || !canvasRef.current || !containerRef.current) return;

      try {
        setLoading(true);
        setErrorMessage("");

        const page = await pdfDocument.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });

        const availableWidth = containerRef.current.clientWidth || 900;
        const maxWidth = Math.min(availableWidth - 24, 1050);
        const scale = maxWidth / baseViewport.width;
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Não foi possível abrir o canvas.");
        }

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
        setErrorMessage(error?.message || "Erro ao renderizar a página.");
      } finally {
        setLoading(false);
      }
    }

    renderPage();

    window.addEventListener("resize", renderPage);

    return () => {
      window.removeEventListener("resize", renderPage);
    };
  }, [pdfDocument, pageNumber]);

  function handleAutomaticPdfLoaded(pdf: LoadedProjectPdf) {
    setPdfFile({
      fileName: pdf.fileName,
      fileSize: pdf.fileSize,
      objectUrl: pdf.objectUrl,
    });

    setSelectedFieldId(null);
    setCreateMode(false);
    setErrorMessage("");
  }

  function openFilePicker() {
    inputRef.current?.click();
  }

  function handlePdfSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.type !== "application/pdf") {
      setErrorMessage("Selecione somente arquivos PDF.");
      event.target.value = "";
      return;
    }

    if (pdfFile?.objectUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(pdfFile.objectUrl);
    }

    const objectUrl = URL.createObjectURL(file);

    setPdfFile({
      fileName: file.name,
      fileSize: file.size,
      objectUrl,
    });

    setFields([]);
    setSelectedFieldId(null);
    setCreateMode(false);
    setErrorMessage("");
  }

  function removePdf() {
    if (pdfFile?.objectUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(pdfFile.objectUrl);
    }

    setPdfFile(null);
    setPdfDocument(null);
    setFields([]);
    setSelectedFieldId(null);
    setCreateMode(false);
    setCanvasSize({ width: 0, height: 0 });
    setMessage("PDF removido. Selecione outro arquivo para continuar.");
    setErrorMessage("");

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function toggleCreateMode() {
    if (!pdfDocument) return;

    setCreateMode((current) => {
      const next = !current;

      setMessage(
        next
          ? "Modo Criar campo ativo. Clique sobre a página."
          : "Modo Criar campo desativado."
      );

      return next;
    });
  }

  function handleCanvasClick(event: MouseEvent<HTMLDivElement>) {
    if (!createMode || !canvasSize.width || !canvasSize.height) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;

    const nextQuestionNumber =
      fields.length > 0
        ? Math.max(...fields.map((field) => field.questionNumber)) + 1
        : 1;

    const newField: VisualField = {
      id: crypto.randomUUID(),
      page: pageNumber,
      questionNumber: nextQuestionNumber,
      fieldType: DEFAULT_FIELD_TYPE,
      answerValue: "",
      points: 1,
      required: true,
      xPercent: Number(xPercent.toFixed(3)),
      yPercent: Number(yPercent.toFixed(3)),
      widthPercent: 10,
      heightPercent: 3.2,
    };

    setFields((current) => [...current, newField]);
    setSelectedFieldId(newField.id);
    setMessage(`Campo Q${nextQuestionNumber} criado.`);
  }

  function handleFieldClick(
    event: MouseEvent<HTMLDivElement>,
    fieldId: string
  ) {
    event.stopPropagation();

    setSelectedFieldId(fieldId);

    const selected = fields.find((field) => field.id === fieldId);

    if (selected) {
      setMessage(`Campo Q${selected.questionNumber} selecionado.`);
    }
  }

  function handleFieldPointerDown(
    event: PointerEvent<HTMLDivElement>,
    field: VisualField
  ) {
    event.preventDefault();
    event.stopPropagation();

    if (!canvasWrapRef.current) return;

    const rect = canvasWrapRef.current.getBoundingClientRect();
    const centerX = rect.left + (field.xPercent / 100) * rect.width;
    const centerY = rect.top + (field.yPercent / 100) * rect.height;

    dragOffset.current = {
      x: event.clientX - centerX,
      y: event.clientY - centerY,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    setSelectedFieldId(field.id);
    setDraggingFieldId(field.id);
    setMessage(`Arrastando Q${field.questionNumber}...`);
  }

  function handleFieldPointerMove(
    event: PointerEvent<HTMLDivElement>,
    field: VisualField
  ) {
    if (draggingFieldId !== field.id || !canvasWrapRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = canvasWrapRef.current.getBoundingClientRect();

    const rawX =
      ((event.clientX - rect.left - dragOffset.current.x) / rect.width) * 100;
    const rawY =
      ((event.clientY - rect.top - dragOffset.current.y) / rect.height) * 100;

    const halfWidth = field.widthPercent / 2;
    const halfHeight = field.heightPercent / 2;

    const nextX = Math.min(
      100 - halfWidth,
      Math.max(halfWidth, rawX)
    );

    const nextY = Math.min(
      100 - halfHeight,
      Math.max(halfHeight, rawY)
    );

    setFields((current) =>
      current.map((item) =>
        item.id === field.id
          ? {
              ...item,
              xPercent: Number(nextX.toFixed(3)),
              yPercent: Number(nextY.toFixed(3)),
            }
          : item
      )
    );
  }

  function handleFieldPointerUp(
    event: PointerEvent<HTMLDivElement>,
    field: VisualField
  ) {
    if (draggingFieldId !== field.id) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDraggingFieldId(null);
    setMessage(`Campo Q${field.questionNumber} movido.`);
  }

  function handleResizePointerDown(
    event: PointerEvent<HTMLDivElement>,
    field: VisualField,
    direction: ResizeDirection
  ) {
    event.preventDefault();
    event.stopPropagation();

    const leftPercent = field.xPercent - field.widthPercent / 2;
    const topPercent = field.yPercent - field.heightPercent / 2;

    resizeStart.current = {
      fieldId: field.id,
      direction,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startWidthPercent: field.widthPercent,
      startHeightPercent: field.heightPercent,
      leftPercent,
      topPercent,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    setSelectedFieldId(field.id);
    setDraggingFieldId(null);
    setResizingFieldId(field.id);
    setMessage(`Redimensionando Q${field.questionNumber}...`);
  }

  function handleResizePointerMove(
    event: PointerEvent<HTMLDivElement>,
    field: VisualField
  ) {
    const start = resizeStart.current;

    if (
      !start ||
      resizingFieldId !== field.id ||
      start.fieldId !== field.id ||
      !canvasWrapRef.current
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const rect = canvasWrapRef.current.getBoundingClientRect();
    const deltaXPercent =
      ((event.clientX - start.startClientX) / rect.width) * 100;
    const deltaYPercent =
      ((event.clientY - start.startClientY) / rect.height) * 100;

    const resizeWidth =
      start.direction === "east" || start.direction === "southeast";
    const resizeHeight =
      start.direction === "south" || start.direction === "southeast";

    const minWidth = 2;
    const minHeight = 1.5;
    const maxWidth = Math.max(minWidth, 100 - start.leftPercent);
    const maxHeight = Math.max(minHeight, 100 - start.topPercent);

    const nextWidth = resizeWidth
      ? Math.min(
          maxWidth,
          Math.max(minWidth, start.startWidthPercent + deltaXPercent)
        )
      : start.startWidthPercent;

    const nextHeight = resizeHeight
      ? Math.min(
          maxHeight,
          Math.max(minHeight, start.startHeightPercent + deltaYPercent)
        )
      : start.startHeightPercent;

    const nextX = start.leftPercent + nextWidth / 2;
    const nextY = start.topPercent + nextHeight / 2;

    setFields((current) =>
      current.map((item) =>
        item.id === field.id
          ? {
              ...item,
              xPercent: Number(nextX.toFixed(3)),
              yPercent: Number(nextY.toFixed(3)),
              widthPercent: Number(nextWidth.toFixed(3)),
              heightPercent: Number(nextHeight.toFixed(3)),
            }
          : item
      )
    );
  }

  function handleResizePointerUp(
    event: PointerEvent<HTMLDivElement>,
    field: VisualField
  ) {
    if (resizingFieldId !== field.id) return;

    event.preventDefault();
    event.stopPropagation();

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resizeStart.current = null;
    setResizingFieldId(null);
    setMessage(`Campo Q${field.questionNumber} redimensionado.`);
  }

  function updateSelectedField(
    updates: Partial<VisualField>
  ) {
    if (!selectedFieldId) return;

    setFields((current) =>
      current.map((field) =>
        field.id === selectedFieldId
          ? { ...field, ...updates }
          : field
      )
    );

    setMessage("Propriedades alteradas. Clique em Salvar campos.");
  }

  async function handleSaveFields() {
    const normalizedProjectId = projectId.trim();

    if (!normalizedProjectId) {
      setErrorMessage(
        "Informe o Project ID ou abra a página com ?projectId=SEU_ID."
      );
      return;
    }

    try {
      setSaving(true);
      setErrorMessage("");
      setMessage("Salvando campos...");

      const orderedFields = [...fields].sort(
        (a, b) =>
          a.page - b.page || a.questionNumber - b.questionNumber
      );

      const rows: VeeField[] = orderedFields.map((field, index) => ({
        project_id: normalizedProjectId,
        page_id: null,
        question_number: field.questionNumber,
        field_type: field.fieldType || DEFAULT_FIELD_TYPE,
        label: `Q${field.questionNumber}`,
        answer_value: field.answerValue || "",
        x: Number(field.xPercent.toFixed(3)),
        y: Number(field.yPercent.toFixed(3)),
        width: Number(field.widthPercent.toFixed(3)),
        height: Number(field.heightPercent.toFixed(3)),
        points: Number(field.points ?? 1),
        required: Boolean(field.required),
        sort_order: index + 1,
        metadata: {
          page: field.page,
        },
        is_deleted: false,
      }));

      const savedFields = await saveFieldsForProject(
        normalizedProjectId,
        rows
      );

      const mappedFields: VisualField[] = savedFields.map(
        (field: any, index: number) => ({
          id: field.id || crypto.randomUUID(),
          page: Number(field.metadata?.page || 1),
          questionNumber: Number(field.question_number || index + 1),
          fieldType: field.field_type || DEFAULT_FIELD_TYPE,
          answerValue: field.answer_value || "",
          points: Number(field.points ?? 1),
          required: Boolean(field.required ?? true),
          xPercent: Number(field.x || 0),
          yPercent: Number(field.y || 0),
          widthPercent: Number(field.width || 10),
          heightPercent: Number(field.height || 3.2),
        })
      );

      setFields(mappedFields);
      setSelectedFieldId(null);
      setMessage(`Campos salvos com sucesso: ${mappedFields.length}`);
    } catch (error: any) {
      setErrorMessage(error?.message || "Erro ao salvar os campos.");
      setMessage("");
    } finally {
      setSaving(false);
    }
  }

  function deleteSelectedField() {
    if (!selectedFieldId) return;

    const selected = fields.find((field) => field.id === selectedFieldId);

    setFields((current) =>
      current.filter((field) => field.id !== selectedFieldId)
    );

    setSelectedFieldId(null);

    setMessage(
      selected
        ? `Campo Q${selected.questionNumber} removido.`
        : "Campo removido."
    );
  }

  useEffect(() => {
    function handleDeleteKey(event: KeyboardEvent) {
      if (event.key !== "Delete" || !selectedFieldId) return;

      const target = event.target as HTMLElement | null;
      const isEditingText =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        Boolean(target?.isContentEditable);

      if (isEditingText) return;

      event.preventDefault();
      deleteSelectedField();
    }

    window.addEventListener("keydown", handleDeleteKey);

    return () => {
      window.removeEventListener("keydown", handleDeleteKey);
    };
  }, [selectedFieldId]);

  function goPreviousPage() {
    setPageNumber((current) => Math.max(1, current - 1));
    setSelectedFieldId(null);
  }

  function goNextPage() {
    setPageNumber((current) => Math.min(numPages, current + 1));
    setSelectedFieldId(null);
  }

  const visibleFields = fields.filter((field) => field.page === pageNumber);
  const selectedField =
    fields.find((field) => field.id === selectedFieldId) || null;

  return (
    <main style={styles.page}>
      <PdfLoader
        projectId={projectId}
        onLoaded={handleAutomaticPdfLoaded}
        onLoadingChange={setLoading}
        onMessage={setMessage}
        onError={setErrorMessage}
      />
      <section style={styles.header}>
        <div>
          <span style={styles.badge}>VEE V6</span>
          <h1 style={styles.title}>Editor Visual de Provas</h1>
          <p style={styles.subtitle}>
            Sprint 7.0 — PDF e campos carregados automaticamente pelo Project ID.
          </p>
        </div>

        <div style={styles.headerActions}>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            onChange={handlePdfSelection}
            style={styles.hiddenInput}
          />

          <button
            type="button"
            onClick={openFilePicker}
            style={styles.primaryButton}
          >
            📄 Selecionar PDF
          </button>

          <button
            type="button"
            onClick={removePdf}
            disabled={!pdfFile}
            style={{
              ...styles.secondaryButton,
              ...(!pdfFile ? styles.disabledButton : {}),
            }}
          >
            Remover PDF
          </button>
        </div>
      </section>

      <section style={styles.projectBox}>
        <div style={styles.projectInputGroup}>
          <label htmlFor="project-id" style={styles.projectLabel}>
            Project ID
          </label>

          <input
            id="project-id"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Cole aqui o ID de vee_projects"
            style={styles.projectInput}
          />
        </div>

        <span style={styles.projectHint}>
          Você também pode abrir com: /admin/visual-v6?projectId=SEU_ID
        </span>
      </section>

      <section style={styles.statusGrid}>
        <article style={styles.statusCard}>
          <span style={styles.statusLabel}>PDF</span>
          <strong style={styles.statusValue}>
            {pdfFile ? "Carregado" : "Não carregado"}
          </strong>
        </article>

        <article style={styles.statusCard}>
          <span style={styles.statusLabel}>Campos</span>
          <strong style={styles.statusValue}>{fields.length}</strong>
        </article>

        <article style={styles.statusCard}>
          <span style={styles.statusLabel}>Modo</span>
          <strong style={styles.statusValue}>
            {createMode ? "Criar campo" : "Seleção"}
          </strong>
        </article>

        <article style={styles.statusCard}>
          <span style={styles.statusLabel}>Persistência</span>
          <strong style={styles.statusValue}>
            {loadingFields
              ? "Carregando..."
              : projectId.trim()
                ? "Supabase ativo"
                : "Sem Project ID"}
          </strong>
        </article>
      </section>

      {message && <section style={styles.messageBox}>{message}</section>}

      {errorMessage && (
        <section style={styles.errorBox}>{errorMessage}</section>
      )}

      {pdfFile ? (
        <>
          <section style={styles.fileInfo}>
            <div>
              <span style={styles.fileLabel}>Arquivo atual</span>
              <strong style={styles.fileName}>{pdfFile.fileName}</strong>
            </div>

            <span style={styles.fileSize}>
              {pdfFile.fileSize > 0
                ? formatFileSize(pdfFile.fileSize)
                : "Supabase Storage"}
            </span>
          </section>

          <div style={styles.editorLayout}>
            <section style={styles.workspace}>
            <div style={styles.toolbar}>
              <button
                type="button"
                onClick={toggleCreateMode}
                style={{
                  ...styles.toolButton,
                  ...(createMode ? styles.activeToolButton : {}),
                }}
              >
                {createMode ? "✖ Sair de criar campo" : "✚ Criar campo"}
              </button>

              <button
                type="button"
                onClick={deleteSelectedField}
                disabled={!selectedFieldId}
                style={{
                  ...styles.dangerButton,
                  ...(!selectedFieldId ? styles.disabledButton : {}),
                }}
              >
                🗑️ Excluir selecionado
              </button>

              <button
                type="button"
                disabled
                style={{ ...styles.toolButton, ...styles.disabledButton }}
              >
                ↔ Arraste direto no campo
              </button>

              <button
                type="button"
                disabled
                style={{ ...styles.toolButton, ...styles.disabledButton }}
              >
                ⤢ Use as alças do campo
              </button>

              <button
                type="button"
                onClick={handleSaveFields}
                disabled={saving || !projectId.trim()}
                style={{
                  ...styles.saveButton,
                  ...(saving || !projectId.trim()
                    ? styles.disabledButton
                    : {}),
                }}
              >
                {saving ? "Salvando..." : "💾 Salvar campos"}
              </button>
            </div>

            <div style={styles.pageControls}>
              <button
                type="button"
                onClick={goPreviousPage}
                disabled={pageNumber <= 1}
                style={{
                  ...styles.secondaryButton,
                  ...(pageNumber <= 1 ? styles.disabledButton : {}),
                }}
              >
                ← Página anterior
              </button>

              <strong>
                Página {pageNumber} de {numPages || 1}
              </strong>

              <button
                type="button"
                onClick={goNextPage}
                disabled={!numPages || pageNumber >= numPages}
                style={{
                  ...styles.secondaryButton,
                  ...(!numPages || pageNumber >= numPages
                    ? styles.disabledButton
                    : {}),
                }}
              >
                Próxima página →
              </button>
            </div>

            <div ref={containerRef} style={styles.pdfStage}>
              {loading && <div style={styles.loading}>Carregando página...</div>}

              <div
                ref={canvasWrapRef}
                onClick={handleCanvasClick}
                style={{
                  ...styles.canvasWrap,
                  width: canvasSize.width || "auto",
                  height: canvasSize.height || "auto",
                  cursor: createMode ? "crosshair" : "default",
                }}
              >
                <canvas ref={canvasRef} style={styles.canvas} />

                <div style={styles.fieldLayer}>
                  {visibleFields.map((field) => {
                    const selected = field.id === selectedFieldId;

                    return (
                      <div
                        key={field.id}
                        onClick={(event) =>
                          handleFieldClick(event, field.id)
                        }
                        onPointerDown={(event) =>
                          handleFieldPointerDown(event, field)
                        }
                        onPointerMove={(event) =>
                          handleFieldPointerMove(event, field)
                        }
                        onPointerUp={(event) =>
                          handleFieldPointerUp(event, field)
                        }
                        onPointerCancel={(event) =>
                          handleFieldPointerUp(event, field)
                        }
                        title={`Q${field.questionNumber}`}
                        style={{
                          ...styles.fieldBox,
                          ...(selected ? styles.selectedFieldBox : {}),
                          ...(draggingFieldId === field.id
                            ? styles.draggingFieldBox
                            : {}),
                          ...(resizingFieldId === field.id
                            ? styles.resizingFieldBox
                            : {}),
                          left: `${field.xPercent}%`,
                          top: `${field.yPercent}%`,
                          width: `${field.widthPercent}%`,
                          height: `${field.heightPercent}%`,
                        }}
                      >
                        Q{field.questionNumber}

                        {selected && (
                          <>
                            <div
                              onPointerDown={(event) =>
                                handleResizePointerDown(event, field, "east")
                              }
                              onPointerMove={(event) =>
                                handleResizePointerMove(event, field)
                              }
                              onPointerUp={(event) =>
                                handleResizePointerUp(event, field)
                              }
                              onPointerCancel={(event) =>
                                handleResizePointerUp(event, field)
                              }
                              style={styles.resizeHandleEast}
                              title="Ajustar largura"
                            />

                            <div
                              onPointerDown={(event) =>
                                handleResizePointerDown(event, field, "south")
                              }
                              onPointerMove={(event) =>
                                handleResizePointerMove(event, field)
                              }
                              onPointerUp={(event) =>
                                handleResizePointerUp(event, field)
                              }
                              onPointerCancel={(event) =>
                                handleResizePointerUp(event, field)
                              }
                              style={styles.resizeHandleSouth}
                              title="Ajustar altura"
                            />

                            <div
                              onPointerDown={(event) =>
                                handleResizePointerDown(
                                  event,
                                  field,
                                  "southeast"
                                )
                              }
                              onPointerMove={(event) =>
                                handleResizePointerMove(event, field)
                              }
                              onPointerUp={(event) =>
                                handleResizePointerUp(event, field)
                              }
                              onPointerCancel={(event) =>
                                handleResizePointerUp(event, field)
                              }
                              style={styles.resizeHandleSoutheast}
                              title="Ajustar largura e altura"
                            />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </section>

            <PropertiesPanel
              field={selectedField}
              onChange={updateSelectedField}
            />
          </div>

          <section style={styles.footerStatus}>
            <strong>Campos nesta página:</strong> {visibleFields.length}
            {" | "}
            <strong>Total no projeto:</strong> {fields.length}
          </section>
        </>
      ) : (
        <section style={styles.emptyState}>
          <div style={styles.emptyIcon}>📄</div>
          <h2 style={styles.emptyTitle}>Nenhum PDF selecionado</h2>
          <p style={styles.emptyText}>
            Clique em “Selecionar PDF” para abrir uma prova.
          </p>

          <button
            type="button"
            onClick={openFilePicker}
            style={styles.primaryButton}
          >
            Escolher PDF
          </button>
        </section>
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    background: "#f1f5f9",
    color: "#0f172a",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "24px",
    flexWrap: "wrap",
    marginBottom: "22px",
  },
  badge: {
    display: "inline-flex",
    padding: "6px 10px",
    borderRadius: "999px",
    background: "#dbeafe",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.06em",
  },
  title: {
    margin: "10px 0 6px",
    fontSize: "32px",
    lineHeight: 1.1,
  },
  subtitle: {
    maxWidth: "720px",
    margin: 0,
    color: "#475569",
    lineHeight: 1.6,
  },
  headerActions: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  hiddenInput: {
    display: "none",
  },
  primaryButton: {
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#ffffff",
    borderRadius: "10px",
    padding: "11px 15px",
    fontWeight: 800,
    cursor: "pointer",
  },
  saveButton: {
    border: "1px solid #16a34a",
    background: "#dcfce7",
    color: "#166534",
    borderRadius: "10px",
    padding: "10px 13px",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondaryButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "10px",
    padding: "10px 13px",
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerButton: {
    border: "1px solid #dc2626",
    background: "#fee2e2",
    color: "#991b1b",
    borderRadius: "10px",
    padding: "10px 13px",
    fontWeight: 800,
    cursor: "pointer",
  },
  disabledButton: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  projectBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: "16px",
    flexWrap: "wrap",
    marginBottom: "16px",
    padding: "14px 16px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
  },
  projectInputGroup: {
    flex: "1 1 430px",
  },
  projectLabel: {
    display: "block",
    marginBottom: "6px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 800,
  },
  projectInput: {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid #94a3b8",
    borderRadius: "9px",
    color: "#0f172a",
    background: "#ffffff",
    fontFamily: "monospace",
  },
  projectHint: {
    color: "#64748b",
    fontSize: "12px",
  },
  statusGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "12px",
    marginBottom: "16px",
  },
  statusCard: {
    padding: "16px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    boxShadow: "0 4px 14px rgba(15, 23, 42, 0.05)",
  },
  statusLabel: {
    display: "block",
    marginBottom: "6px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  statusValue: {
    fontSize: "17px",
  },
  messageBox: {
    marginBottom: "16px",
    padding: "12px 14px",
    background: "#ecfdf5",
    border: "1px solid #86efac",
    borderRadius: "12px",
    color: "#166534",
    fontWeight: 700,
  },
  errorBox: {
    marginBottom: "16px",
    padding: "12px 14px",
    background: "#fef2f2",
    border: "1px solid #fca5a5",
    borderRadius: "12px",
    color: "#b91c1c",
    fontWeight: 700,
  },
  fileInfo: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    padding: "14px 16px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    marginBottom: "14px",
  },
  fileLabel: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 700,
    marginBottom: "3px",
  },
  fileName: {
    wordBreak: "break-word",
  },
  fileSize: {
    color: "#475569",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
  editorLayout: {
    display: "flex",
    alignItems: "flex-start",
    gap: "16px",
  },
  workspace: {
    flex: "1 1 auto",
    minWidth: 0,
    overflow: "hidden",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "16px",
    boxShadow: "0 12px 30px rgba(15, 23, 42, 0.10)",
  },
  toolbar: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  toolButton: {
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    color: "#334155",
    borderRadius: "9px",
    padding: "9px 12px",
    fontWeight: 700,
    cursor: "pointer",
  },
  activeToolButton: {
    border: "1px solid #2563eb",
    background: "#dbeafe",
    color: "#1d4ed8",
  },
  pageControls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
  },
  pdfStage: {
    width: "100%",
    minHeight: "720px",
    overflow: "auto",
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "12px",
    background: "#dbe1e8",
  },
  loading: {
    position: "absolute",
    top: "18px",
    right: "18px",
    zIndex: 30,
    padding: "8px 12px",
    borderRadius: "8px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    fontWeight: 700,
  },
  canvasWrap: {
    position: "relative",
    flex: "0 0 auto",
    background: "#ffffff",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.22)",
  },
  canvas: {
    display: "block",
  },
  fieldLayer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
  fieldBox: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    border: "2px solid #2563eb",
    background: "rgba(37, 99, 235, 0.14)",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
    borderRadius: "4px",
    cursor: "grab",
    userSelect: "none",
    touchAction: "none",
  },
  draggingFieldBox: {
    cursor: "grabbing",
    zIndex: 20,
  },
  resizingFieldBox: {
    zIndex: 25,
  },
  resizeHandleEast: {
    position: "absolute",
    top: "50%",
    right: "-7px",
    width: "12px",
    height: "30px",
    transform: "translateY(-50%)",
    border: "2px solid #ffffff",
    borderRadius: "999px",
    background: "#1d4ed8",
    cursor: "ew-resize",
    touchAction: "none",
    zIndex: 30,
  },
  resizeHandleSouth: {
    position: "absolute",
    left: "50%",
    bottom: "-7px",
    width: "30px",
    height: "12px",
    transform: "translateX(-50%)",
    border: "2px solid #ffffff",
    borderRadius: "999px",
    background: "#1d4ed8",
    cursor: "ns-resize",
    touchAction: "none",
    zIndex: 30,
  },
  resizeHandleSoutheast: {
    position: "absolute",
    right: "-8px",
    bottom: "-8px",
    width: "15px",
    height: "15px",
    border: "2px solid #ffffff",
    borderRadius: "4px",
    background: "#1d4ed8",
    cursor: "nwse-resize",
    touchAction: "none",
    zIndex: 31,
  },
  selectedFieldBox: {
    border: "3px solid #1d4ed8",
    background: "rgba(37, 99, 235, 0.28)",
    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.22)",
    zIndex: 10,
  },
  footerStatus: {
    marginTop: "12px",
    padding: "12px 14px",
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    color: "#334155",
  },
  emptyState: {
    minHeight: "520px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "32px",
    background: "#ffffff",
    border: "2px dashed #cbd5e1",
    borderRadius: "16px",
  },
  emptyIcon: {
    fontSize: "56px",
    marginBottom: "12px",
  },
  emptyTitle: {
    margin: "0 0 8px",
  },
  emptyText: {
    maxWidth: "520px",
    margin: "0 0 18px",
    color: "#64748b",
    lineHeight: 1.6,
  },
};
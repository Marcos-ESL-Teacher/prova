"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type ExamBlock = {
  id: string;
  exam_id: string;
  block_type: string;
  sort_order: number;
  title?: string | null;
  content?: string | null;
  question_number?: number | null;
  question_type?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  option_e?: string | null;
  correct_answer?: string | null;
  points?: number | null;
  is_active?: boolean | null;
};

type VisualField = {
  id: string;
  exam_id: string;
  project_id?: string | null;
  page_number: number;
  question_number: number;
  field_type: string;
  answer_value?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  correct_answer?: string | null;
};

export default function StudentExamBlocksPage() {
  const params = useParams();
  const examId = String(params.examId || "");

  const [exam, setExam] = useState<any>(null);
  const [blocks, setBlocks] = useState<ExamBlock[]>([]);
  const [visualFields, setVisualFields] = useState<VisualField[]>([]);
  const [pdfUrl, setPdfUrl] = useState("");
  const [visualCurrentPage, setVisualCurrentPage] = useState(1);
  const [visualTotalPages, setVisualTotalPages] = useState(1);
  const visualPageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [protocol, setProtocol] = useState("");

  useEffect(() => {
    loadPageData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pdfUrl || !isPdfFile(pdfUrl)) return;
    renderVisualPdfPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfUrl, visualCurrentPage]);

  function isPdfFile(fileUrl: string) {
    const cleanUrl = fileUrl.split("?")[0].toLowerCase();
    return cleanUrl.includes(".pdf") || fileUrl.toLowerCase().includes("application/pdf");
  }

  async function renderVisualPdfPage() {
    const canvas = visualPageCanvasRef.current;
    if (!canvas || !pdfUrl || !isPdfFile(pdfUrl)) return;

    try {
      const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url
      ).toString();

      const pdf = await pdfjsLib.getDocument({ url: pdfUrl }).promise;
      const pageNumber = Math.min(Math.max(1, Number(visualCurrentPage || 1)), Number(pdf.numPages || 1));
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });

      const availableWidth = Math.min(900, Math.max(620, window.innerWidth * 0.82));
      const scale = availableWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const dpr = window.devicePixelRatio || 1;
      const context = canvas.getContext("2d");
      if (!context) return;

      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, viewport.width, viewport.height);
      await page.render({ canvasContext: context, viewport }).promise;
    } catch (error) {
      console.log("Erro ao renderizar PDF no aluno:", error);
    }
  }

  async function loadPageData() {
    setLoading(true);

    const { data: examRows, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .limit(1);

    if (examError) {
      alert("Erro ao carregar prova: " + examError.message);
      setLoading(false);
      return;
    }

    const examData = Array.isArray(examRows) ? examRows[0] : null;

    if (!examData) {
      alert("Erro ao carregar prova: prova não encontrada.");
      setLoading(false);
      return;
    }

    setExam(examData);

    const legacyPdfValue =
      examData?.pdf_url || examData?.pdf_storage_path || "";

    if (legacyPdfValue) {
      await loadPdf(legacyPdfValue);
    }

    const { data: blocksData, error: blocksError } = await supabase
      .from("exam_blocks")
      .select("*")
      .eq("exam_id", examId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (blocksError) {
      alert("Erro ao carregar blocos da prova: " + blocksError.message);
      setLoading(false);
      return;
    }

    setBlocks(blocksData || []);

    // Primeiro tenta carregar os campos do VEE novo (vee_projects + vee_fields).
    // Se não houver projeto VEE vinculado, mantém compatibilidade com a tabela antiga.
    let loadedVisualFields: VisualField[] = [];

    let veeProjectId =
      examData?.vee_project_id ||
      examData?.visual_project_id ||
      examData?.project_id ||
      "";

    let veeProjectPdfPath = "";

    if (veeProjectId) {
      const { data: projectRows, error: projectError } = await supabase
        .from("vee_projects")
        .select("id, pdf_path")
        .eq("id", veeProjectId)
        .limit(1);

      if (projectError) {
        console.log(
          "Não foi possível carregar o projeto VEE vinculado:",
          projectError.message
        );
      } else if (Array.isArray(projectRows) && projectRows.length > 0) {
        veeProjectId = String(projectRows[0].id);
        veeProjectPdfPath = String(projectRows[0].pdf_path || "");
      }
    } else {
      const { data: projectRows, error: projectError } = await supabase
        .from("vee_projects")
        .select("id, pdf_path")
        .eq("exam_id", examId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (projectError) {
        console.log(
          "Não foi possível localizar o projeto VEE:",
          projectError.message
        );
      } else if (Array.isArray(projectRows) && projectRows.length > 0) {
        veeProjectId = String(projectRows[0].id);
        veeProjectPdfPath = String(projectRows[0].pdf_path || "");
      }
    }

    if (!legacyPdfValue && veeProjectPdfPath) {
      await loadPdf(veeProjectPdfPath);
    }

    if (veeProjectId) {
      const { data: veeFieldsData, error: veeFieldsError } = await supabase
        .from("vee_fields")
        .select("*")
        .eq("project_id", veeProjectId)
        .eq("is_deleted", false)
        .order("sort_order", { ascending: true });

      if (veeFieldsError) {
        console.log("Erro ao carregar campos do VEE:", veeFieldsError.message);
      } else {
        loadedVisualFields = (veeFieldsData || []).map((field: any) => ({
          id: String(field.id),
          exam_id: examId,
          project_id: String(field.project_id || veeProjectId),
          page_number: Number(field.metadata?.page || 1),
          question_number: Number(field.question_number || 1),
          field_type: String(field.field_type || "short_text"),
          answer_value: field.answer_value || "",
          x: Number(field.x || 0),
          y: Number(field.y || 0),
          width: Number(field.width || 10),
          height: Number(field.height || 3),
          correct_answer: field.correct_answer || "",
        }));
      }
    }

    if (loadedVisualFields.length === 0) {
      const { data: fieldsData, error: fieldsError } = await supabase
        .from("exam_visual_fields")
        .select("*")
        .eq("exam_id", examId)
        .order("page_number", { ascending: true })
        .order("question_number", { ascending: true });

      if (fieldsError) {
        console.log("Erro ao carregar campos visuais antigos:", fieldsError.message);
      } else {
        loadedVisualFields = (fieldsData || []).map((field: any) => ({
          id: String(field.id),
          exam_id: String(field.exam_id),
          project_id: null,
          page_number: Number(field.page_number || 1),
          question_number: Number(field.question_number || 1),
          field_type: String(field.field_type || "text"),
          answer_value: field.answer_value || "",
          x: Number(field.x || 0),
          y: Number(field.y || 0),
          width: Number(field.width || 8),
          height: Number(field.height || 4),
          correct_answer: field.correct_answer || "",
        }));
      }
    }

    setVisualFields(loadedVisualFields);
    setLoading(false);
  }

  async function loadPdf(pdfStoragePathOrUrl: string) {
    if (!pdfStoragePathOrUrl) {
      setPdfUrl("");
      setVisualCurrentPage(1);
      setVisualTotalPages(1);
      return;
    }

    if (
      pdfStoragePathOrUrl.startsWith("http://") ||
      pdfStoragePathOrUrl.startsWith("https://")
    ) {
      setPdfUrl(pdfStoragePathOrUrl);
      await loadPdfPageCount(pdfStoragePathOrUrl);
      return;
    }

    const cleanPath = pdfStoragePathOrUrl
      .replace(/^\/+/, "")
      .replace(/^exam-pdfs\//, "");

    const { data, error } = await supabase.storage
      .from("exam-pdfs")
      .createSignedUrl(cleanPath, 60 * 60 * 4);

    if (error) {
      console.log("Erro ao carregar PDF/imagem:", error.message);
      return;
    }

    setPdfUrl(data.signedUrl);
    await loadPdfPageCount(data.signedUrl);
  }

  async function loadPdfPageCount(fileUrl: string) {
    setVisualCurrentPage(1);

    if (!isPdfFile(fileUrl)) {
      setVisualTotalPages(1);
      return;
    }

    try {
      const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url
      ).toString();

      const pdf = await pdfjsLib.getDocument({ url: fileUrl }).promise;
      setVisualTotalPages(Number(pdf.numPages || 1));
    } catch (error) {
      console.log("Não foi possível contar páginas do PDF:", error);
      setVisualTotalPages(1);
    }
  }

  function isVisualExam() {
    return (
      exam?.exam_mode === "visual" ||
      exam?.visual_enabled === true ||
      Boolean(exam?.pdf_url || exam?.pdf_storage_path) ||
      visualFields.length > 0
    );
  }

  function getQuestionBlocks() {
    return blocks.filter((block) => block.block_type === "question");
  }

  function visualAnswerKey(field: VisualField) {
    return `field_${field.id}`;
  }

  function getVisualQuestionKeys() {
    const questionNumbers = visualFields
      .filter((field) => Number(field.question_number || 0) < 9000)
      .map((field) => String(field.question_number || 1));

    return Array.from(new Set(questionNumbers)).map((questionNumber) => `visual_q_${questionNumber}`);
  }

  function updateAnswer(questionKey: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionKey]: value,
    }));
  }

  function countAnsweredQuestions() {
    if (isVisualExam()) {
      return getVisualQuestionKeys().filter((key) => {
        const value = answers[key];
        return value !== undefined && value.toString().trim() !== "";
      }).length;
    }

    const questionBlocks = getQuestionBlocks();

    return questionBlocks.filter((block) => {
      const value = answers[block.id];
      return value !== undefined && value.toString().trim() !== "";
    }).length;
  }

  async function submitExam() {
    if (!studentName.trim()) {
      alert("Digite seu nome.");
      return;
    }

    let finalAnswers: Record<string, string> = {};
    let totalQuestions = 0;
    let unansweredCount = 0;

    if (isVisualExam()) {
      const questionKeys = getVisualQuestionKeys();
      totalQuestions = questionKeys.length;

      if (!pdfUrl || questionKeys.length === 0) {
        alert("Esta prova visual ainda não foi configurada pelo professor.");
        return;
      }

      questionKeys.forEach((key) => {
        finalAnswers[key] = answers[key] || "";
      });

      unansweredCount = questionKeys.filter((key) => {
        const value = answers[key];
        return value === undefined || value.toString().trim() === "";
      }).length;
    } else {
      const questionBlocks = getQuestionBlocks();
      totalQuestions = questionBlocks.length;

      if (questionBlocks.length === 0) {
        alert("Esta prova digital ainda não tem questões cadastradas.");
        return;
      }

      questionBlocks.forEach((block) => {
        finalAnswers[block.id] = answers[block.id] || "";
      });

      unansweredCount = questionBlocks.filter((block) => {
        const value = answers[block.id];
        return value === undefined || value.toString().trim() === "";
      }).length;
    }

    if (unansweredCount > 0) {
      const confirmSend = window.confirm(
        `Você deixou ${unansweredCount} de ${totalQuestions} questão(ões) sem resposta.\n\nDeseja enviar mesmo assim?`
      );

      if (!confirmSend) return;
    }

    const generatedProtocol = `SUB-${Date.now()}.${Math.floor(
      Math.random() * 1000000
    )}`;

    setSending(true);

    const { error: submissionError } = await supabase
      .from("exam_submissions")
      .insert([
        {
          exam_id: examId,
          student_name: studentName.trim(),
          student_phone: studentPhone.trim(),
          exam_name: exam?.title || "Exam",
          protocol: generatedProtocol,
          answers: finalAnswers,
          correction_status: "pending",
        },
      ]);

    setSending(false);

    if (submissionError) {
      alert("Erro ao enviar prova: " + submissionError.message);
      return;
    }

    setProtocol(generatedProtocol);
    setSent(true);
  }

  function renderBlock(block: ExamBlock) {
    if (block.block_type === "header") {
      return (
        <section key={block.id} style={styles.headerBlock}>
          {block.title && <h2 style={styles.blockTitle}>{block.title}</h2>}
          {block.content && <p style={styles.blockContent}>{block.content}</p>}
        </section>
      );
    }

    if (block.block_type === "instruction") {
      return (
        <section key={block.id} style={styles.instructionBlock}>
          {block.title && <h3 style={styles.instructionTitle}>{block.title}</h3>}
          {block.content && <p style={styles.instructionText}>{block.content}</p>}
        </section>
      );
    }

    if (block.block_type === "example") {
      return (
        <section key={block.id} style={styles.exampleBlock}>
          {block.title && <strong>{block.title}</strong>}
          {block.content && <p style={styles.exampleText}>{block.content}</p>}
        </section>
      );
    }

    if (block.block_type === "word_bank") {
      return (
        <section key={block.id} style={styles.wordBankBlock}>
          {block.title && <h3 style={styles.wordBankTitle}>{block.title}</h3>}
          {block.content && (
            <div style={styles.wordBankWords}>
              {block.content.split("|").map((word, index) => (
                <span key={index} style={styles.wordPill}>
                  {word.trim()}
                </span>
              ))}
            </div>
          )}
        </section>
      );
    }

    if (block.block_type === "question") {
      const options: Array<[string, string | null | undefined]> = [
        ["a", block.option_a],
        ["b", block.option_b],
        ["c", block.option_c],
        ["d", block.option_d],
        ["e", block.option_e],
      ];

      return (
        <section key={block.id} style={styles.questionBlock}>
          <h3 style={styles.questionTitle}>
            {block.question_number}. {block.content}
          </h3>

          {block.question_type === "multiple_choice" && (
            <div style={styles.optionsArea}>
              {options.map(([letter, text]) => {
                if (!text) return null;

                const optionLetter = String(letter);

                return (
                  <label
                    key={optionLetter}
                    style={{
                      ...styles.option,
                      ...(answers[block.id] === optionLetter
                        ? styles.optionSelected
                        : {}),
                    }}
                  >
                    <input
                      type="radio"
                      name={block.id}
                      value={optionLetter}
                      checked={answers[block.id] === optionLetter}
                      onChange={() => updateAnswer(block.id, optionLetter)}
                      style={styles.radio}
                    />

                    <span style={styles.optionLetter}>
                      {optionLetter.toUpperCase()})
                    </span>

                    <span>{text}</span>
                  </label>
                );
              })}
            </div>
          )}

          {block.question_type === "fill_blank" && (
            <input
              style={styles.answerLineInput}
              placeholder="Digite sua resposta"
              value={answers[block.id] || ""}
              onChange={(e) => updateAnswer(block.id, e.target.value)}
            />
          )}
        </section>
      );
    }

    return null;
  }

  function getVisualFieldsForStudent() {
    return visualFields
      .filter((field) => Number(field.question_number || 0) < 9000)
      .sort((a, b) => {
        const qa = Number(a.question_number || 0);
        const qb = Number(b.question_number || 0);
        if (qa !== qb) return qa - qb;
        return String(a.answer_value || "").localeCompare(String(b.answer_value || ""));
      });
  }

  function getGroupedVisualQuestions() {
    const grouped: Record<string, VisualField[]> = {};

    getVisualFieldsForStudent().forEach((field) => {
      const questionNumber = String(field.question_number || 1);
      if (!grouped[questionNumber]) grouped[questionNumber] = [];
      grouped[questionNumber].push(field);
    });

    return Object.entries(grouped).sort((a, b) => Number(a[0]) - Number(b[0]));
  }
function renderVisualFieldV5(field: VisualField) {
  const questionKey = `visual_q_${field.question_number}`;

  if (field.field_type === "choice") {
    const selected =
      answers[questionKey] === String(field.answer_value || "");

    return (
      <button
        key={field.id}
        type="button"
        onClick={() =>
          updateAnswer(
            questionKey,
            String(field.answer_value || "")
          )
        }
        style={{
          ...styles.visualAnswerField,
          ...(selected ? styles.visualChoiceSelected : {}),
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
          pointerEvents: "auto",
        }}
      >
        {field.answer_value}
      </button>
    );
  }

  if (field.field_type === "checkbox") {
    const optionValue = String(field.answer_value || "");
    const currentValues = String(answers[questionKey] || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const checked = currentValues.includes(optionValue);

    function toggleCheckbox() {
      const nextValues = checked
        ? currentValues.filter((value) => value !== optionValue)
        : [...currentValues, optionValue];

      updateAnswer(questionKey, nextValues.join(","));
    }

    return (
      <button
        key={field.id}
        type="button"
        aria-pressed={checked}
        onClick={toggleCheckbox}
        style={{
          ...styles.visualAnswerField,
          ...(checked ? styles.visualChoiceSelected : {}),
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
          pointerEvents: "auto",
        }}
      >
        {checked ? "☑" : "☐"} {optionValue}
      </button>
    );
  }

  if (field.field_type === "essay") {
    return (
      <textarea
        key={field.id}
        value={answers[questionKey] || ""}
        onChange={(e) =>
          updateAnswer(questionKey, e.target.value)
        }
        style={{
          ...styles.visualAnswerField,
          ...styles.visualEssayInput,
          left: `${field.x}%`,
          top: `${field.y}%`,
          width: `${field.width}%`,
          height: `${field.height}%`,
          pointerEvents: "auto",
        }}
      />
    );
  }

  return (
    <input
      key={field.id}
      type="text"
      aria-label={`Resposta da questão ${field.question_number}`}
      placeholder="Digite aqui"
      value={answers[questionKey] || ""}
      onChange={(e) =>
        updateAnswer(questionKey, e.target.value)
      }
      style={{
        ...styles.visualAnswerField,
        ...styles.visualTextInput,
        left: `${field.x}%`,
        top: `${field.y}%`,
        width: `${field.width}%`,
        height: `${field.height}%`,
        pointerEvents: "auto",
      }}
    />
  );
}
  function renderStableVisualQuestion(questionNumber: string, fields: VisualField[]) {
    const firstField = fields[0];
    const questionKey = `visual_q_${questionNumber}`;
    const hasChoice = fields.some((field) => field.field_type === "choice");
    const hasCheckbox = fields.some(
      (field) => field.field_type === "checkbox"
    );
    const hasEssay = fields.some((field) => field.field_type === "essay" || field.field_type === "doubt");

    if (hasChoice) {
      const options = fields
        .filter((field) => field.field_type === "choice")
        .map((field) => String(field.answer_value || "").trim().toUpperCase())
        .filter(Boolean);

      const uniqueOptions = Array.from(new Set(options.length > 0 ? options : ["A", "B", "C", "D", "E"]));

      return (
        <section key={questionNumber} style={styles.stableQuestionCard}>
          <h3 style={styles.questionTitle}>Question {questionNumber}</h3>
          <div style={styles.stableOptionsGrid}>
            {uniqueOptions.map((letter) => (
              <label
                key={letter}
                style={{
                  ...styles.stableOption,
                  ...(answers[questionKey] === letter ? styles.optionSelected : {}),
                }}
              >
                <input
                  type="radio"
                  name={questionKey}
                  value={letter}
                  checked={answers[questionKey] === letter}
                  onChange={() => updateAnswer(questionKey, letter)}
                  style={styles.radio}
                />
                <span style={styles.optionLetter}>{letter}</span>
              </label>
            ))}
          </div>
        </section>
      );
    }

    if (hasCheckbox) {
      const options = fields
        .filter((field) => field.field_type === "checkbox")
        .map((field) => String(field.answer_value || "").trim())
        .filter(Boolean);

      const selectedValues = String(answers[questionKey] || "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);

      return (
        <section key={questionNumber} style={styles.stableQuestionCard}>
          <h3 style={styles.questionTitle}>Question {questionNumber}</h3>

          <div style={styles.stableOptionsGrid}>
            {options.map((value) => {
              const checked = selectedValues.includes(value);

              return (
                <label
                  key={value}
                  style={{
                    ...styles.stableOption,
                    ...(checked ? styles.optionSelected : {}),
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const nextValues = checked
                        ? selectedValues.filter((item) => item !== value)
                        : [...selectedValues, value];

                      updateAnswer(questionKey, nextValues.join(","));
                    }}
                  />
                  <span style={styles.optionLetter}>{value}</span>
                </label>
              );
            })}
          </div>
        </section>
      );
    }

    if (hasEssay || firstField?.field_type === "essay") {
      return (
        <section key={questionNumber} style={styles.stableQuestionCard}>
          <h3 style={styles.questionTitle}>Question {questionNumber}</h3>
          <textarea
            value={answers[questionKey] || ""}
            onChange={(e) => updateAnswer(questionKey, e.target.value)}
            style={styles.stableTextarea}
            placeholder="Type your answer here"
          />
        </section>
      );
    }

    return (
      <section key={questionNumber} style={styles.stableQuestionCard}>
        <h3 style={styles.questionTitle}>Question {questionNumber}</h3>
        <input
          value={answers[questionKey] || ""}
          onChange={(e) => updateAnswer(questionKey, e.target.value)}
          style={styles.answerLineInput}
          placeholder="Type your answer"
        />
      </section>
    );
  }

  function renderVisualExam() {
    const groupedQuestions = getGroupedVisualQuestions();

    return (
      <div style={styles.visualExamBox}>
        <h2 style={styles.digitalExamTitle}>Prova Visual VEE — responda diretamente no PDF</h2>

        {!pdfUrl && (
          <div style={styles.warningBox}>
            Esta prova ainda não possui PDF/imagem associado.
          </div>
        )}

        {pdfUrl && (
          <>
            <div style={styles.visualPageControls}>
              <button
                type="button"
                onClick={() => setVisualCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={visualCurrentPage <= 1}
                style={styles.secondaryButton}
              >
                ◀ Página anterior
              </button>

              <strong>
                Página {visualCurrentPage} de {visualTotalPages}
              </strong>

              <button
                type="button"
                onClick={() => setVisualCurrentPage((prev) => Math.min(visualTotalPages, prev + 1))}
                disabled={visualCurrentPage >= visualTotalPages}
                style={styles.secondaryButton}
              >
                Próxima página ▶
              </button>
            </div>

<div style={styles.visualPaperStable}>
  <div style={styles.visualPdfSurface}>
    {isPdfFile(pdfUrl) ? (
      <canvas
        ref={visualPageCanvasRef}
        style={styles.visualPdfCanvas}
      />
 
) : (
  <img
    src={pdfUrl}
    alt="Prova"
    style={styles.visualImage}
/>
    )}

    <div style={styles.visualFieldsLayer}>
      {visualFields
        .filter(
          (field) =>
            Number(field.page_number) === Number(visualCurrentPage)
        )
        .map((field) => renderVisualFieldV5(field))}
    </div>
  </div>
</div>
          </>
        )}

        <div style={styles.stableAnswerBox}>
          <h2 style={styles.digitalExamTitle}>Respostas</h2>
          <p style={styles.helpText}>
            Responda diretamente nos campos sobre o PDF. A lista abaixo serve como apoio.
          </p>

          {groupedQuestions.length === 0 && (
            <div style={styles.warningBox}>
              O professor ainda não criou a lista de questões desta prova.
            </div>
          )}

          {groupedQuestions.map(([questionNumber, fields]) =>
            renderStableVisualQuestion(questionNumber, fields)
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.paper}>
          <h2>Carregando prova digital...</h2>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div style={styles.page}>
        <div style={styles.paper}>
          <header style={styles.logoArea}>
            <img src="/logo.jpg" alt="Logo" style={styles.logo} />
            <div>
              <h1 style={styles.schoolName}>Marcos Aulas Individuais de Inglês</h1>
              <p style={styles.schoolSubtitle}>Learn English Since 2011</p>
            </div>
          </header>

          <hr style={styles.hr} />

          <div style={styles.successBox}>
            <h1>✅ Prova enviada com sucesso!</h1>
            <p>Aguarde a correção do professor.</p>
            <p>
              <strong>Protocolo:</strong> {protocol}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = isVisualExam()
    ? getVisualQuestionKeys().length
    : getQuestionBlocks().length;
  const answeredQuestions = countAnsweredQuestions();

  return (
    <div style={styles.page}>
      <div style={styles.paper}>
        <header style={styles.logoArea}>
          <img src="/logo.jpg" alt="Logo" style={styles.logo} />
          <div>
            <h1 style={styles.schoolName}>Marcos Aulas Individuais de Inglês</h1>
            <p style={styles.schoolSubtitle}>Learn English Since 2011</p>
          </div>
        </header>

        <hr style={styles.hr} />

        <div style={styles.examTitleBox}>
          <h2 style={styles.examTitle}>{exam?.title || "Prova Digital"}</h2>
          {exam?.description && (
            <p style={styles.examDescription}>{exam.description}</p>
          )}
        </div>

        <div style={styles.studentInfoGrid}>
          <div>
            <label style={styles.label}>Student Name</label>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              style={styles.underlineInput}
              placeholder="Digite seu nome"
            />
          </div>

          <div>
            <label style={styles.label}>WhatsApp</label>
            <input
              value={studentPhone}
              onChange={(e) => setStudentPhone(e.target.value)}
              style={styles.underlineInput}
              placeholder="Digite seu WhatsApp"
            />
          </div>

          <div>
            <label style={styles.label}>Date</label>
            <input
              value={new Date().toLocaleDateString()}
              readOnly
              style={styles.underlineInput}
            />
          </div>
        </div>

        <div style={styles.progressBox}>
          <strong>Progresso:</strong> {answeredQuestions} de {totalQuestions} questões respondidas
        </div>

        {isVisualExam() ? (
          renderVisualExam()
        ) : (
          <>
            {pdfUrl && (
              <details style={styles.pdfDetails}>
                <summary style={styles.pdfSummary}>📄 Ver PDF original</summary>
                <iframe src={pdfUrl} width="100%" height="850" style={styles.iframe} />
              </details>
            )}

            <div style={styles.digitalExamBox}>
              <h2 style={styles.digitalExamTitle}>Prova Digital</h2>

              {blocks.length === 0 && (
                <div style={styles.warningBox}>
                  Nenhum bloco digital foi cadastrado para esta prova.
                </div>
              )}

              {blocks.map((block) => renderBlock(block))}
            </div>
          </>
        )}

        <button onClick={submitExam} disabled={sending} style={styles.submitButton}>
          {sending ? "Enviando..." : "Enviar Prova"}
        </button>
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#e5e7eb",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },

  paper: {
    maxWidth: "980px",
    margin: "0 auto",
    background: "#fff",
    padding: "34px",
    borderRadius: "8px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.14)",
  },

  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "14px",
  },

  logo: {
    width: "76px",
    height: "76px",
    objectFit: "contain",
  },

  schoolName: {
    margin: 0,
    fontSize: "24px",
    color: "#111827",
  },

  schoolSubtitle: {
    margin: "4px 0 0",
    fontSize: "14px",
    color: "#475569",
  },

  hr: {
    border: "none",
    borderTop: "1px solid #cbd5e1",
    margin: "18px 0 22px",
  },

  examTitleBox: {
    textAlign: "center",
    marginBottom: "24px",
  },

  examTitle: {
    margin: 0,
    fontSize: "28px",
    color: "#111827",
  },

  examDescription: {
    marginTop: "8px",
    color: "#475569",
  },

  studentInfoGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1.5fr 1fr",
    gap: "16px",
    marginBottom: "28px",
  },

  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: "bold",
    color: "#334155",
    marginBottom: "6px",
  },

  underlineInput: {
    width: "100%",
    border: "none",
    borderBottom: "2px solid #94a3b8",
    padding: "10px 4px",
    fontSize: "16px",
    outline: "none",
    background: "transparent",
  },

  pdfDetails: {
    marginBottom: "26px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#f8fafc",
  },

  pdfSummary: {
    padding: "14px 18px",
    cursor: "pointer",
    fontWeight: "bold",
    background: "#f1f5f9",
  },

  iframe: {
    border: "none",
    background: "#fff",
  },

  progressBox: {
    padding: "14px 16px",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    marginBottom: "20px",
    color: "#334155",
  },

  digitalExamBox: {
    marginTop: "20px",
  },

  digitalExamTitle: {
    fontSize: "24px",
    marginBottom: "16px",
    color: "#111827",
  },

  headerBlock: {
    textAlign: "center",
    background: "#f8fafc",
    padding: "18px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    marginBottom: "18px",
  },

  blockTitle: {
    margin: 0,
    fontSize: "24px",
    color: "#111827",
  },

  blockContent: {
    margin: "8px 0 0",
    color: "#475569",
    fontSize: "16px",
  },

  instructionBlock: {
    padding: "16px",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: "10px",
    marginBottom: "16px",
  },

  instructionTitle: {
    margin: "0 0 6px",
    color: "#1d4ed8",
  },

  instructionText: {
    margin: 0,
    color: "#1e3a8a",
  },

  exampleBlock: {
    padding: "14px",
    background: "#fefce8",
    border: "1px solid #fde68a",
    borderRadius: "10px",
    marginBottom: "16px",
  },

  exampleText: {
    margin: "6px 0 0",
  },

  wordBankBlock: {
    padding: "16px",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: "10px",
    marginBottom: "18px",
  },

  wordBankTitle: {
    margin: "0 0 10px",
    color: "#166534",
  },

  wordBankWords: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
  },

  wordPill: {
    background: "#fff",
    border: "1px solid #86efac",
    borderRadius: "999px",
    padding: "8px 12px",
    fontWeight: "bold",
    color: "#166534",
  },

  questionBlock: {
    padding: "18px 0",
    borderBottom: "1px solid #e5e7eb",
  },

  questionTitle: {
    margin: "0 0 14px",
    fontSize: "18px",
    color: "#111827",
    lineHeight: "1.45",
  },

  optionsArea: {
    display: "grid",
    gap: "8px",
  },

  option: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    cursor: "pointer",
    background: "#fff",
  },

  optionSelected: {
    background: "#eff6ff",
    border: "1px solid #2563eb",
  },

  radio: {
    transform: "scale(1.2)",
  },

  optionLetter: {
    fontWeight: "bold",
    minWidth: "24px",
  },

  answerLineInput: {
    width: "100%",
    border: "none",
    borderBottom: "2px solid #94a3b8",
    padding: "12px 4px",
    fontSize: "17px",
    outline: "none",
  },

  warningBox: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    padding: "16px",
    borderRadius: "10px",
    marginBottom: "22px",
  },


  visualPaperStable: {
    display: "flex",
    justifyContent: "center",
    background: "#f8fafc",
    border: "1px solid #dbe3ef",
    borderRadius: "12px",
    padding: "14px",
    marginBottom: "22px",
    overflowX: "auto",
  },

  visualPdfCanvasStable: {
    display: "block",
    maxWidth: "100%",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
  },

  visualImageStable: {
    display: "block",
    maxWidth: "100%",
    height: "auto",
    borderRadius: "8px",
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.12)",
  },

  stableAnswerBox: {
    marginTop: "24px",
    padding: "20px",
    border: "1px solid #dbeafe",
    borderRadius: "14px",
    background: "#f8fbff",
  },

  stableQuestionCard: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    marginTop: "14px",
  },

  stableOptionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
    gap: "10px",
    marginTop: "10px",
  },

  stableOption: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "12px",
    cursor: "pointer",
    background: "#fff",
  },

  stableTextarea: {
    width: "100%",
    minHeight: "120px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "12px",
    fontSize: "16px",
    outline: "none",
    resize: "vertical",
  },

  helpText: {
    margin: "0 0 12px",
    color: "#475569",
    lineHeight: 1.5,
  },
  submitButton: {
    width: "100%",
    padding: "16px",
    marginTop: "28px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "17px",
  },

  secondaryButton: {
    padding: "10px 14px",
    background: "#e2e8f0",
    color: "#0f172a",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  successBox: {
    marginTop: "30px",
    background: "#ecfdf5",
    border: "1px solid #86efac",
    padding: "24px",
    borderRadius: "12px",
    textAlign: "center",
  },

  visualExamBox: {
    marginTop: "20px",
  },

  visualPageControls: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    marginTop: "16px",
    marginBottom: "12px",
    flexWrap: "wrap",
  },

  visualPaper: {
    position: "relative",
    width: "100%",
    height: "82vh",
    maxHeight: "82vh",
    background: "#111827",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    overflow: "auto",
    padding: "16px",
  },

  visualPdfSurface: {
    position: "relative",
    width: "fit-content",
    minWidth: "320px",
    minHeight: "320px",
    margin: "0 auto",
    background: "#fff",
    isolation: "isolate",
    boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
  },

  visualPdfCanvas: {
    position: "relative",
    zIndex: 1,
    display: "block",
    background: "#fff",
    pointerEvents: "none",
  },

  visualImage: {
    maxWidth: "900px",
    width: "auto",
    display: "block",
    pointerEvents: "none",
  },

  visualFieldsLayer: {
    position: "absolute",
    inset: 0,
    zIndex: 400,
    pointerEvents: "none",
  },

  visualAnswerField: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    border: "2px solid rgba(37, 99, 235, 0.95)",
    background: "rgba(255,255,255,0.82)",
    color: "#111827",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "18px",
    cursor: "pointer",
    outline: "none",
    zIndex: 500,
  },

  visualChoiceSelected: {
    background: "rgba(219, 234, 254, 0.85)",
    color: "#1d4ed8",
    border: "3px solid #1d4ed8",
  },

  visualTextInput: {
    padding: "0 6px 1px",
    fontSize: "16px",
    textAlign: "center",
    background: "rgba(255,255,255,0.72)",
    border: "none",
    borderBottom: "2px solid #2563eb",
    borderRadius: "0",
    height: "100%",
    boxShadow: "none",
  },

  visualEssayInput: {
    padding: "6px",
    fontSize: "14px",
    resize: "none",
    background: "rgba(255,255,255,0.96)",
    border: "2px solid #2563eb",
    boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
  },

  visualDoubtInput: {
    background: "rgba(255,255,255,0.96)",
    border: "2px dashed #2563eb",
    fontSize: "13px",
  },
};

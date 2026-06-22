"use client";

import { useEffect, useState } from "react";
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
  page_number: number;
  question_number: number;
  field_type: "choice" | "text" | "essay";
  answer_value?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  correct_answer?: string | null;
};

export default function StudentExamBlocksPage() {
  const params = useParams();
  const examId = params.examId as string;

  const [exam, setExam] = useState<any>(null);
  const [blocks, setBlocks] = useState<ExamBlock[]>([]);
  const [visualFields, setVisualFields] = useState<VisualField[]>([]);
  const [pdfUrl, setPdfUrl] = useState("");
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

  async function loadPageData() {
    setLoading(true);

    const { data: examData, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError) {
      alert("Erro ao carregar prova: " + examError.message);
      setLoading(false);
      return;
    }

    setExam(examData);

    const pdfValue = examData?.pdf_url || examData?.pdf_storage_path || "";
    if (pdfValue) {
      await loadPdf(pdfValue);
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

    const { data: fieldsData, error: fieldsError } = await supabase
      .from("exam_visual_fields")
      .select("*")
      .eq("exam_id", examId)
      .order("question_number", { ascending: true });

    if (!fieldsError) {
      setVisualFields(
        (fieldsData || []).map((field: any) => ({
          id: field.id,
          exam_id: field.exam_id,
          page_number: Number(field.page_number || 1),
          question_number: Number(field.question_number || 1),
          field_type: field.field_type || "choice",
          answer_value: field.answer_value || "",
          x: Number(field.x || 0),
          y: Number(field.y || 0),
          width: Number(field.width || 8),
          height: Number(field.height || 4),
          correct_answer: field.correct_answer || "",
        }))
      );
    }

    setLoading(false);
  }

  async function loadPdf(pdfStoragePathOrUrl: string) {
    if (!pdfStoragePathOrUrl) return;

    if (
      pdfStoragePathOrUrl.startsWith("http://") ||
      pdfStoragePathOrUrl.startsWith("https://")
    ) {
      setPdfUrl(pdfStoragePathOrUrl);
      return;
    }

    const { data, error } = await supabase.storage
      .from("exam-pdfs")
      .createSignedUrl(pdfStoragePathOrUrl, 60 * 60 * 4);

    if (error) {
      console.log("Erro ao carregar PDF/imagem:", error.message);
      return;
    }

    setPdfUrl(data.signedUrl);
  }

  function isVisualExam() {
    return exam?.exam_mode === "visual" || exam?.visual_enabled === true;
  }

  function getQuestionBlocks() {
    return blocks.filter((block) => block.block_type === "question");
  }

  function getVisualQuestionKeys() {
    const keys = new Set<string>();
    visualFields.forEach((field) => keys.add(`q${field.question_number}`));
    return Array.from(keys);
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

      if (!pdfUrl || visualFields.length === 0) {
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

  function renderVisualField(field: VisualField, index: number) {
    const questionKey = `q${field.question_number}`;
    const selectedValue = answers[questionKey] || "";
    const answerValue = (field.answer_value || "").toString().toUpperCase();

    const baseStyle = {
      ...styles.visualAnswerField,
      left: `${field.x}%`,
      top: `${field.y}%`,
      width: `${field.width}%`,
      height: `${field.height}%`,
    };

    if (field.field_type === "choice") {
      const selected = selectedValue.toUpperCase() === answerValue;

      return (
        <button
          key={field.id || index}
          type="button"
          onClick={() => updateAnswer(questionKey, answerValue)}
          style={{
            ...baseStyle,
            ...(selected ? styles.visualChoiceSelected : {}),
          }}
          title={`Questão ${field.question_number} - ${answerValue}`}
        >
          {selected ? "X" : ""}
        </button>
      );
    }

    if (field.field_type === "essay") {
      return (
        <textarea
          key={field.id || index}
          value={selectedValue}
          onChange={(e) => updateAnswer(questionKey, e.target.value)}
          style={{ ...baseStyle, ...styles.visualEssayInput }}
          placeholder={`Q${field.question_number}`}
        />
      );
    }

    return (
      <input
        key={field.id || index}
        value={selectedValue}
        onChange={(e) => updateAnswer(questionKey, e.target.value)}
        style={{ ...baseStyle, ...styles.visualTextInput }}
        placeholder={`Q${field.question_number}`}
      />
    );
  }

  function renderVisualExam() {
    return (
      <div style={styles.visualExamBox}>
        <h2 style={styles.digitalExamTitle}>Prova Visual Interativa</h2>

        {!pdfUrl && (
          <div style={styles.warningBox}>
            Esta prova visual ainda não possui PDF/imagem associado.
          </div>
        )}

        {pdfUrl && visualFields.length === 0 && (
          <div style={styles.warningBox}>
            O professor ainda não marcou os campos clicáveis desta prova.
          </div>
        )}

        {pdfUrl && (
          <div style={styles.visualPaper}>
            {pdfUrl.toLowerCase().includes(".pdf") ? (
              <iframe src={pdfUrl} style={styles.visualPdfFrame} />
            ) : (
              <img src={pdfUrl} alt="Prova" style={styles.visualImage} />
            )}

            {visualFields.map((field, index) => renderVisualField(field, index))}
          </div>
        )}
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

  visualPaper: {
    position: "relative",
    width: "100%",
    minHeight: "880px",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    overflow: "hidden",
  },

  visualPdfFrame: {
    width: "100%",
    height: "980px",
    border: "none",
    background: "#fff",
    pointerEvents: "none",
  },

  visualImage: {
    width: "100%",
    display: "block",
    pointerEvents: "none",
  },

  visualAnswerField: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    border: "2px solid #2563eb",
    background: "rgba(255,255,255,0.45)",
    color: "#111827",
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "20px",
    cursor: "pointer",
    outline: "none",
    zIndex: 5,
  },

  visualChoiceSelected: {
    background: "rgba(219, 234, 254, 0.85)",
    color: "#1d4ed8",
    border: "3px solid #1d4ed8",
  },

  visualTextInput: {
    padding: "4px 6px",
    fontSize: "15px",
    textAlign: "center",
    background: "rgba(255,255,255,0.85)",
  },

  visualEssayInput: {
    padding: "6px",
    fontSize: "14px",
    resize: "none",
    background: "rgba(255,255,255,0.9)",
  },
};

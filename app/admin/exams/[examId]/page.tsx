"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function StudentExamPage() {
  const params = useParams();
  const examId = params.examId as string;

  const [exam, setExam] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPageData();
  }, []);

  async function loadPageData() {
    setLoading(true);

    const { data: examData, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (examError) {
      setLoading(false);
      alert("Erro ao carregar prova: " + examError.message);
      return;
    }

    setExam(examData);

    if (examData?.pdf_storage_path) {
      await loadPdf(examData.pdf_storage_path);
    }

    const { data: questionsData, error: questionsError } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("is_active", true)
      .order("question_number", { ascending: true });

    if (questionsError) {
      setLoading(false);
      alert("Erro ao carregar questões: " + questionsError.message);
      return;
    }

    setQuestions(questionsData || []);
    setLoading(false);
  }

  async function loadPdf(pdfStoragePath: string) {
    const { data, error } = await supabase.storage
      .from("exam-pdfs")
      .createSignedUrl(pdfStoragePath, 60 * 60 * 4);

    if (error) {
      console.log("Erro ao carregar PDF:", error.message);
      return;
    }

    setPdfUrl(data.signedUrl);
  }

  function updateAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }

  async function submitExam() {
    if (!studentName.trim()) {
      alert("Digite seu nome.");
      return;
    }

    if (questions.length === 0) {
      alert("Esta prova ainda não tem questões cadastradas para resposta.");
      return;
    }

    const finalAnswers: Record<string, string> = {};

    questions.forEach((q) => {
      finalAnswers[q.id] = answers[q.id] || "";
    });

    setSending(true);

    const { data: submission, error: submissionError } = await supabase
      .from("exam_submissions")
      .insert([
        {
          exam_id: examId,
          student_name: studentName.trim(),
          student_phone: studentPhone.trim(),
          exam_name: exam?.title || "Exam",
          answers: finalAnswers,
          correction_status: "pending",
        },
      ])
      .select()
      .single();

    if (submissionError) {
      setSending(false);
      alert("Erro ao enviar prova: " + submissionError.message);
      return;
    }

    const answerRows = questions.map((q) => ({
      submission_id: submission.id,
      exam_id: examId,
      question_id: q.id,
      question_number: q.question_number,
      student_answer: finalAnswers[q.id] || "",
      is_correct: null,
    }));

    const { error: answersError } = await supabase
      .from("exam_answers")
      .insert(answerRows);

    setSending(false);

    if (answersError) {
      alert("Erro ao salvar respostas: " + answersError.message);
      return;
    }

    setSent(true);
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.paper}>
          <h2>Carregando prova...</h2>
        </div>
      </div>
    );
  }

  if (sent) {
    return (
      <div style={styles.page}>
        <div style={styles.paper}>
          <Header />

          <div style={styles.successBox}>
            <h1>✅ Prova enviada com sucesso!</h1>
            <p>Aguarde a correção do professor.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.paper}>
        <Header />

        <hr style={styles.hr} />

        <div style={styles.examTitleBox}>
          <h2 style={styles.examTitle}>{exam?.title || "Prova"}</h2>
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

        {pdfUrl ? (
          <div style={styles.pdfBox}>
            <div style={styles.pdfHeader}>📄 Prova Original</div>

            <iframe
              src={pdfUrl}
              width="100%"
              height="900"
              style={styles.iframe}
            />
          </div>
        ) : (
          <div style={styles.warningBox}>
            Nenhum PDF original foi encontrado para esta prova. O aluno ainda
            poderá responder as questões cadastradas abaixo.
          </div>
        )}

        <h2 style={styles.answersTitle}>Respostas</h2>

        {questions.length === 0 && (
          <div style={styles.warningBox}>
            Esta prova ainda não possui questões cadastradas para resposta.
          </div>
        )}

        <div style={styles.questionsArea}>
          {questions.map((q) => (
            <div key={q.id} style={styles.questionBlock}>
              <h3 style={styles.questionTitle}>
                {q.question_number}. {q.question_text}
              </h3>

              {q.question_type === "multiple_choice" && (
                <div style={styles.optionsArea}>
                  {[
                    ["a", q.option_a],
                    ["b", q.option_b],
                    ["c", q.option_c],
                    ["d", q.option_d],
                    ["e", q.option_e],
                  ].map(([letter, text]) => {
                    if (!text) return null;

                    return (
                      <label
                        key={letter}
                        style={{
                          ...styles.option,
                          ...(answers[q.id] === letter
                            ? styles.optionSelected
                            : {}),
                        }}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={letter}
                          checked={answers[q.id] === letter}
                          onChange={() => updateAnswer(q.id, letter)}
                          style={styles.radio}
                        />

                        <span style={styles.optionLetter}>
                          {String(letter).toUpperCase()})
                        </span>

                        <span>{text}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {q.question_type === "fill_blank" && (
                <input
                  style={styles.answerLineInput}
                  placeholder="Digite sua resposta"
                  value={answers[q.id] || ""}
                  onChange={(e) => updateAnswer(q.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        <button onClick={submitExam} disabled={sending} style={styles.submitButton}>
          {sending ? "Enviando..." : "Enviar Prova"}
        </button>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={styles.logoArea}>
      <img src="/logo.jpg" alt="Logo" style={styles.logo} />
      <div>
        <h1 style={styles.schoolName}>Marcos Aulas Individuais de Inglês</h1>
        <p style={styles.schoolSubtitle}>Learn English Since 2011</p>
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

  pdfBox: {
    marginBottom: "32px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    overflow: "hidden",
    background: "#f8fafc",
  },

  pdfHeader: {
    padding: "14px 18px",
    fontWeight: "bold",
    background: "#f1f5f9",
    borderBottom: "1px solid #cbd5e1",
  },

  iframe: {
    border: "none",
    background: "#fff",
  },

  warningBox: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    padding: "16px",
    borderRadius: "10px",
    marginBottom: "22px",
  },

  answersTitle: {
    marginTop: "12px",
    marginBottom: "12px",
    fontSize: "24px",
    color: "#111827",
  },

  questionsArea: {
    marginTop: "12px",
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
};

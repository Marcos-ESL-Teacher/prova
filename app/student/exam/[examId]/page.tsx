"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function StudentExamPage() {
  const params = useParams();
  const examId = params.examId as string;

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [studentName, setStudentName] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    loadExam();
    loadQuestions();
  }, []);

  async function loadExam() {
    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single();

    if (error) return alert(error.message);
    setExam(data);
  }

  async function loadQuestions() {
    const { data, error } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .eq("is_active", true)
      .order("question_number", { ascending: true });

    if (error) return alert(error.message);
    setQuestions(data || []);
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
      alert("Esta prova ainda não tem questões.");
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

  if (sent) {
    return (
      <div style={styles.page}>
        <div style={styles.examPaper}>
          <div style={styles.logoArea}>
            <img src="/logo.jpg" alt="Logo" style={styles.logo} />
            <div>
              <h1 style={styles.schoolName}>Marcos Aulas Individuais de Inglês</h1>
              <p style={styles.schoolSubtitle}>Learn English Since 2011</p>
            </div>
          </div>

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
      <div style={styles.examPaper}>
        <div style={styles.logoArea}>
          <img src="/logo.jpg" alt="Logo" style={styles.logo} />
          <div>
            <h1 style={styles.schoolName}>Marcos Aulas Individuais de Inglês</h1>
            <p style={styles.schoolSubtitle}>Learn English Since 2011</p>
          </div>
        </div>

        <hr style={styles.hr} />

        <div style={styles.examTitleBox}>
          <h2 style={styles.examTitle}>{exam?.title || "Prova"}</h2>
          {exam?.description && <p style={styles.examDescription}>{exam.description}</p>}
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

        {questions.length === 0 && (
          <div style={styles.emptyBox}>
            Esta prova ainda não possui questões cadastradas.
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
                          ...(answers[q.id] === letter ? styles.optionSelected : {}),
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

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#e5e7eb",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
  },

  examPaper: {
    maxWidth: "900px",
    margin: "0 auto",
    background: "#fff",
    padding: "38px",
    borderRadius: "6px",
    boxShadow: "0 12px 35px rgba(0,0,0,0.14)",
  },

  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    marginBottom: "14px",
  },

  logo: {
    width: "78px",
    height: "78px",
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
    fontSize: "26px",
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

  questionsArea: {
    marginTop: "18px",
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

  emptyBox: {
    background: "#fff7ed",
    border: "1px solid #fed7aa",
    color: "#9a3412",
    padding: "18px",
    borderRadius: "10px",
    marginBottom: "20px",
  },
};
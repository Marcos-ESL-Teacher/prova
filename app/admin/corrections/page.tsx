"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Submission = {
  id: string;
  protocol?: string | null;
  student_name?: string | null;
  student_email?: string | null;
  answers?: Record<string, string>;
  created_at?: string | null;
  book_name?: string | null;
  unit_folder?: string | null;
  subfolder_name?: string | null;
  exam_name?: string | null;
  exam_id?: string | null;
  score?: number | null;
  total?: number | null;
};

type Question = {
  id: string;
  question_number?: number | null;
  content?: string | null;
  question_text?: string | null;
  title?: string | null;
  correct_answer?: string | null;
  points?: number | null;
  question_type?: string | null;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  option_e?: string | null;
};

type Review = {
  id?: string;
  teacher_comment?: string;
  ai_feedback?: string;
  teacher_score?: string;
  ai_score?: string;
  reviewed?: boolean;
};

export default function CorrectionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadSubmissions();
  }, []);

  async function loadSubmissions() {
    setLoading(true);

    const { data, error } = await supabase
      .from("exam_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    setLoading(false);

    if (error) {
      alert("Erro ao carregar submissões: " + error.message);
      return;
    }

    setSubmissions((data || []) as Submission[]);
  }

  async function openSubmission(submission: Submission) {
    setSelectedSubmission(submission);
    setQuestions([]);
    setReviews({});
    setLoading(true);

    try {
      const examId = submission.exam_id;

      let loadedQuestions: Question[] = [];

      if (examId) {
        const { data: blockData, error: blockError } = await supabase
          .from("exam_blocks")
          .select("*")
          .eq("exam_id", examId)
          .eq("block_type", "question")
          .order("sort_order", { ascending: true });

        if (blockError) {
          console.warn("Erro ao buscar exam_blocks:", blockError.message);
        }

        loadedQuestions = (blockData || []) as Question[];

        if (loadedQuestions.length === 0) {
          const { data: oldQuestions, error: oldQuestionsError } = await supabase
            .from("exam_questions")
            .select("*")
            .eq("exam_id", examId)
            .order("question_number", { ascending: true });

          if (oldQuestionsError) {
            console.warn("Erro ao buscar exam_questions:", oldQuestionsError.message);
          }

          loadedQuestions = (oldQuestions || []) as Question[];
        }
      }

      /*
        Se a prova antiga não tiver perguntas em exam_blocks ou exam_questions,
        criamos uma visualização mínima usando as chaves do JSON answers.
      */
      if (loadedQuestions.length === 0 && submission.answers) {
        loadedQuestions = Object.keys(submission.answers).map((questionId, index) => ({
          id: questionId,
          question_number: index + 1,
          content: `Questão ${index + 1}`,
          correct_answer: "",
          points: 1,
          question_type: "open_answer",
        }));
      }

      setQuestions(loadedQuestions);

      const { data: savedReviews, error: reviewError } = await supabase
        .from("exam_answers")
        .select("*")
        .eq("submission_id", submission.id);

      if (reviewError) {
        console.warn("Erro ao buscar comentários:", reviewError.message);
      }

      const reviewMap: Record<string, Review> = {};

      (savedReviews || []).forEach((row: any) => {
        const key = row.question_id || String(row.question_number || "");
        reviewMap[key] = {
          id: row.id,
          teacher_comment: row.teacher_comment || "",
          ai_feedback: row.ai_feedback || "",
          teacher_score:
            row.teacher_score === null || row.teacher_score === undefined
              ? ""
              : String(row.teacher_score),
          ai_score:
            row.ai_score === null || row.ai_score === undefined ? "" : String(row.ai_score),
          reviewed: Boolean(row.reviewed),
        };
      });

      setReviews(reviewMap);
    } finally {
      setLoading(false);
    }
  }

  function normalizeAnswer(value: any) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, " ");
  }

  function getQuestionText(question: Question) {
    return (
      question.content ||
      question.question_text ||
      question.title ||
      `Questão ${question.question_number || ""}`
    );
  }

  function getStudentAnswer(question: Question) {
    if (!selectedSubmission?.answers) return "";

    return (
      selectedSubmission.answers[question.id] ||
      selectedSubmission.answers[String(question.question_number || "")] ||
      ""
    );
  }

  function isCorrect(question: Question) {
    const correct = normalizeAnswer(question.correct_answer);
    const answer = normalizeAnswer(getStudentAnswer(question));

    if (!correct || !answer) return null;

    return correct === answer;
  }

  function getReviewKey(question: Question) {
    return question.id || String(question.question_number || "");
  }

  function updateReview(question: Question, field: keyof Review, value: string | boolean) {
    const key = getReviewKey(question);

    setReviews((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] || {}),
        [field]: value,
      },
    }));
  }

  async function saveReview(question: Question) {
    if (!selectedSubmission) return;

    const key = getReviewKey(question);
    const review = reviews[key] || {};
    const studentAnswer = getStudentAnswer(question);
    const correct = isCorrect(question);

    setSavingId(key);

    const payload: any = {
      submission_id: selectedSubmission.id,
      exam_id: selectedSubmission.exam_id || null,
      question_id: question.id || null,
      question_number: question.question_number || null,
      student_answer: studentAnswer || "",
      is_correct: correct,
      teacher_comment: review.teacher_comment || "",
      ai_feedback: review.ai_feedback || "",
      teacher_score:
        review.teacher_score === "" || review.teacher_score === undefined
          ? null
          : Number(review.teacher_score),
      ai_score:
        review.ai_score === "" || review.ai_score === undefined ? null : Number(review.ai_score),
      reviewed: true,
    };

    try {
      if (review.id) {
        const { error } = await supabase
          .from("exam_answers")
          .update(payload)
          .eq("id", review.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("exam_answers")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        setReviews((prev) => ({
          ...prev,
          [key]: {
            ...review,
            id: data.id,
            reviewed: true,
          },
        }));
      }

      alert("Correção salva.");
    } catch (error: any) {
      alert("Erro ao salvar correção: " + (error?.message || String(error)));
    } finally {
      setSavingId(null);
    }
  }

  function gerarFeedbackLocal(question: Question) {
    const studentAnswer = getStudentAnswer(question);
    const correct = question.correct_answer || "";
    const questionType = question.question_type || "open_answer";

    let feedback = "";

    if (!studentAnswer) {
      feedback = "O aluno não respondeu esta questão.";
    } else if (questionType === "writing" || questionType === "open_answer") {
      feedback =
        "Feedback IA futuro: avaliar gramática, vocabulário, organização, coerência e cumprimento da tarefa.";
    } else if (correct && normalizeAnswer(studentAnswer) === normalizeAnswer(correct)) {
      feedback = "Resposta correta. Bom trabalho.";
    } else if (correct) {
      feedback = `Resposta incorreta. Resposta esperada: ${correct}.`;
    } else {
      feedback =
        "Sem gabarito cadastrado. Esta questão precisa de correção manual do professor.";
    }

    updateReview(question, "ai_feedback", feedback);
  }

  const filteredSubmissions = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return submissions;

    return submissions.filter((submission) => {
      return (
        String(submission.student_name || "").toLowerCase().includes(q) ||
        String(submission.student_email || "").toLowerCase().includes(q) ||
        String(submission.protocol || "").toLowerCase().includes(q) ||
        String(submission.exam_name || "").toLowerCase().includes(q)
      );
    });
  }, [submissions, search]);

  const summary = useMemo(() => {
    if (!selectedSubmission || questions.length === 0) {
      return { total: 0, correct: 0, wrong: 0, manual: 0 };
    }

    let correct = 0;
    let wrong = 0;
    let manual = 0;

    questions.forEach((question) => {
      const result = isCorrect(question);

      if (result === true) correct++;
      else if (result === false) wrong++;
      else manual++;
    });

    return {
      total: questions.length,
      correct,
      wrong,
      manual,
    };
  }, [selectedSubmission, questions, reviews]);

  return (
    <main style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🧑‍🏫 Correção Inteligente</h1>
          <p style={styles.subtitle}>
            Corrija respostas, adicione observações do professor e prepare feedback com IA.
          </p>
        </div>

        <button onClick={loadSubmissions} style={styles.refreshButton}>
          🔄 Atualizar
        </button>
      </div>

      <div style={styles.layout}>
        <section style={styles.sidebar}>
          <h2 style={styles.cardTitle}>Submissões</h2>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar aluno, email, protocolo..."
            style={styles.input}
          />

          {loading && <p style={styles.muted}>Carregando...</p>}

          {!loading && filteredSubmissions.length === 0 && (
            <p style={styles.muted}>Nenhuma submissão encontrada.</p>
          )}

          {filteredSubmissions.map((submission) => (
            <button
              key={submission.id}
              onClick={() => openSubmission(submission)}
              style={{
                ...styles.submissionButton,
                ...(selectedSubmission?.id === submission.id
                  ? styles.submissionButtonActive
                  : {}),
              }}
            >
              <strong>{submission.student_name || "Aluno sem nome"}</strong>
              <span>{submission.exam_name || submission.book_name || "Prova"}</span>
              <small>{submission.protocol || submission.id}</small>
            </button>
          ))}
        </section>

        <section style={styles.content}>
          {!selectedSubmission && (
            <div style={styles.emptyState}>
              <h2>Selecione uma submissão</h2>
              <p>Escolha um aluno na lista para começar a correção.</p>
            </div>
          )}

          {selectedSubmission && (
            <>
              <div style={styles.studentCard}>
                <div>
                  <h2 style={styles.cardTitle}>
                    👤 {selectedSubmission.student_name || "Aluno sem nome"}
                  </h2>
                  <p style={styles.subtitle}>
                    Protocolo: {selectedSubmission.protocol || "Não informado"}
                  </p>
                  <p style={styles.subtitle}>
                    Email: {selectedSubmission.student_email || "Não informado"}
                  </p>
                  <p style={styles.subtitle}>
                    Prova: {selectedSubmission.exam_name || selectedSubmission.book_name || "Não informada"}
                  </p>
                </div>

                <div style={styles.summaryBox}>
                  <strong>{summary.total}</strong>
                  <span>questões</span>
                  <strong style={styles.correctText}>{summary.correct}</strong>
                  <span>certas</span>
                  <strong style={styles.wrongText}>{summary.wrong}</strong>
                  <span>erradas</span>
                  <strong>{summary.manual}</strong>
                  <span>manual</span>
                </div>
              </div>

              {questions.length === 0 && (
                <div style={styles.emptyState}>
                  <h2>Nenhuma questão encontrada</h2>
                  <p>
                    Esta submissão possui respostas, mas não encontrei questões em
                    exam_blocks ou exam_questions.
                  </p>
                </div>
              )}

              {questions.map((question, index) => {
                const key = getReviewKey(question);
                const review = reviews[key] || {};
                const studentAnswer = getStudentAnswer(question);
                const correct = isCorrect(question);

                return (
                  <article key={key || index} style={styles.questionCard}>
                    <div style={styles.questionHeader}>
                      <div>
                        <h3 style={styles.questionTitle}>
                          Questão {question.question_number || index + 1}
                        </h3>
                        <p style={styles.questionType}>
                          Tipo: {question.question_type || "não informado"} · Pontos:{" "}
                          {question.points || 1}
                        </p>
                      </div>

                      <div
                        style={{
                          ...styles.statusBadge,
                          ...(correct === true
                            ? styles.statusCorrect
                            : correct === false
                            ? styles.statusWrong
                            : styles.statusManual),
                        }}
                      >
                        {correct === true
                          ? "✓ Correta"
                          : correct === false
                          ? "✗ Incorreta"
                          : "Manual"}
                      </div>
                    </div>

                    <div style={styles.questionText}>{getQuestionText(question)}</div>

                    {(question.option_a ||
                      question.option_b ||
                      question.option_c ||
                      question.option_d ||
                      question.option_e) && (
                      <div style={styles.optionsBox}>
                        {question.option_a && <p>A) {question.option_a}</p>}
                        {question.option_b && <p>B) {question.option_b}</p>}
                        {question.option_c && <p>C) {question.option_c}</p>}
                        {question.option_d && <p>D) {question.option_d}</p>}
                        {question.option_e && <p>E) {question.option_e}</p>}
                      </div>
                    )}

                    <div style={styles.answerGrid}>
                      <div style={styles.answerBox}>
                        <strong>Resposta do aluno</strong>
                        <p>{studentAnswer || "Sem resposta"}</p>
                      </div>

                      <div style={styles.answerBox}>
                        <strong>Resposta correta</strong>
                        <p>{question.correct_answer || "Sem gabarito cadastrado"}</p>
                      </div>
                    </div>

                    <label style={styles.label}>Observação do professor</label>
                    <textarea
                      value={review.teacher_comment || ""}
                      onChange={(e) =>
                        updateReview(question, "teacher_comment", e.target.value)
                      }
                      placeholder="Escreva uma observação para esta questão..."
                      style={styles.textarea}
                    />

                    <div style={styles.aiHeader}>
                      <label style={styles.label}>Feedback IA / sugestão</label>

                      <button
                        onClick={() => gerarFeedbackLocal(question)}
                        style={styles.aiButton}
                      >
                        ✨ Gerar sugestão local
                      </button>
                    </div>

                    <textarea
                      value={review.ai_feedback || ""}
                      onChange={(e) => updateReview(question, "ai_feedback", e.target.value)}
                      placeholder="Aqui ficará o feedback da IA ou sua própria sugestão..."
                      style={styles.textarea}
                    />

                    <div style={styles.scoreGrid}>
                      <div>
                        <label style={styles.label}>Nota IA</label>
                        <input
                          type="number"
                          step="0.1"
                          value={review.ai_score || ""}
                          onChange={(e) =>
                            updateReview(question, "ai_score", e.target.value)
                          }
                          style={styles.input}
                        />
                      </div>

                      <div>
                        <label style={styles.label}>Nota professor</label>
                        <input
                          type="number"
                          step="0.1"
                          value={review.teacher_score || ""}
                          onChange={(e) =>
                            updateReview(question, "teacher_score", e.target.value)
                          }
                          style={styles.input}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => saveReview(question)}
                      disabled={savingId === key}
                      style={styles.saveButton}
                    >
                      {savingId === key ? "Salvando..." : "💾 Salvar correção desta questão"}
                    </button>
                  </article>
                );
              })}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "center",
    marginBottom: "22px",
  },

  title: {
    margin: 0,
    color: "#0f172a",
  },

  subtitle: {
    color: "#64748b",
    margin: "6px 0",
    fontSize: "14px",
  },

  layout: {
    display: "grid",
    gridTemplateColumns: "330px 1fr",
    gap: "18px",
    alignItems: "start",
  },

  sidebar: {
    background: "#fff",
    borderRadius: "16px",
    padding: "18px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
    position: "sticky",
    top: "20px",
  },

  content: {
    minWidth: 0,
  },

  cardTitle: {
    margin: "0 0 10px",
    color: "#111827",
  },

  refreshButton: {
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  input: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    padding: "11px",
    marginBottom: "10px",
  },

  submissionButton: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    width: "100%",
    textAlign: "left",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    background: "#f9fafb",
    padding: "12px",
    marginBottom: "10px",
    cursor: "pointer",
    color: "#111827",
  },

  submissionButtonActive: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
  },

  muted: {
    color: "#64748b",
  },

  emptyState: {
    background: "#fff",
    borderRadius: "16px",
    padding: "28px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
    color: "#334155",
  },

  studentCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
    marginBottom: "18px",
    display: "flex",
    justifyContent: "space-between",
    gap: "18px",
    alignItems: "center",
  },

  summaryBox: {
    display: "grid",
    gridTemplateColumns: "auto auto",
    gap: "4px 10px",
    alignItems: "center",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "14px",
  },

  correctText: {
    color: "#16a34a",
  },

  wrongText: {
    color: "#dc2626",
  },

  questionCard: {
    background: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
    marginBottom: "18px",
  },

  questionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "flex-start",
  },

  questionTitle: {
    margin: "0 0 4px",
    color: "#111827",
  },

  questionType: {
    margin: 0,
    color: "#64748b",
    fontSize: "13px",
  },

  statusBadge: {
    padding: "8px 10px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
    whiteSpace: "nowrap",
  },

  statusCorrect: {
    background: "#dcfce7",
    color: "#166534",
  },

  statusWrong: {
    background: "#fee2e2",
    color: "#991b1b",
  },

  statusManual: {
    background: "#e0f2fe",
    color: "#075985",
  },

  questionText: {
    marginTop: "14px",
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    padding: "14px",
    borderRadius: "12px",
    lineHeight: 1.5,
  },

  optionsBox: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
    marginTop: "12px",
  },

  answerGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "12px",
  },

  answerBox: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "12px",
  },

  label: {
    display: "block",
    marginTop: "14px",
    marginBottom: "6px",
    fontWeight: "bold",
    color: "#111827",
  },

  textarea: {
    width: "100%",
    minHeight: "86px",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "12px",
    resize: "vertical",
  },

  aiHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
  },

  aiButton: {
    background: "#9333ea",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "9px 12px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  scoreGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginTop: "8px",
  },

  saveButton: {
    marginTop: "12px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

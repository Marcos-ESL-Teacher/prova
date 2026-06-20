"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Submission = {
  id: string;
  protocol?: string | null;
  student_name?: string | null;
  student_email?: string | null;
  answers?: Record<string, string>;
  created_at?: string | null;
  book_name?: string | null;
  exam_name?: string | null;
  exam_id?: string | null;
  final_score?: number | null;
  final_percentage?: number | null;
  correction_completed?: boolean | null;
  correct_answers?: number | null;
  wrong_answers?: number | null;
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
  question_number?: number | null;
  student_answer?: string | null;
  teacher_comment?: string | null;
  ai_feedback?: string | null;
  teacher_score?: number | null;
  ai_score?: number | null;
  reviewed?: boolean | null;
};

export default function StudentResultPage() {
  const params = useParams();
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResult();
  }, []);

  async function loadResult() {
    setLoading(true);

    const { data: submissionData, error: submissionError } = await supabase
      .from("exam_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (submissionError) {
      alert("Resultado não encontrado.");
      setLoading(false);
      return;
    }

    const sub = submissionData as Submission;
    setSubmission(sub);

    let loadedQuestions: Question[] = [];

    if (sub.exam_id) {
      const { data: blockData } = await supabase
        .from("exam_blocks")
        .select("*")
        .eq("exam_id", sub.exam_id)
        .eq("block_type", "question")
        .order("sort_order", { ascending: true });

      loadedQuestions = (blockData || []) as Question[];
    }

    setQuestions(loadedQuestions);

    const { data: reviewData } = await supabase
      .from("exam_answers")
      .select("*")
      .eq("submission_id", submissionId);

    const map: Record<string, Review> = {};

    (reviewData || []).forEach((row: any) => {
      map[String(row.question_number || "")] = row;
    });

    setReviews(map);
    setLoading(false);
  }

  function normalize(value: any) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function getQuestionText(question: Question) {
    return question.content || question.question_text || question.title || "";
  }

  function getStudentAnswer(question: Question) {
    if (!submission?.answers) return "";

    return (
      submission.answers[question.id] ||
      submission.answers[String(question.question_number || "")] ||
      ""
    );
  }

  function isCorrect(question: Question) {
    const correct = normalize(question.correct_answer);
    const answer = normalize(getStudentAnswer(question));

    if (!correct || !answer) return null;

    return correct === answer;
  }

  const summary = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let manual = 0;

    questions.forEach((question) => {
      const result = isCorrect(question);
      if (result === true) correct++;
      else if (result === false) wrong++;
      else manual++;
    });

    const total = questions.length;
    const score10 = total > 0 ? Number(((correct / total) * 10).toFixed(2)) : 0;
    const percentage = total > 0 ? Number(((correct / total) * 100).toFixed(2)) : 0;

    return { total, correct, wrong, manual, score10, percentage };
  }, [questions, submission]);

  function printPage() {
    window.print();
  }

  if (loading) {
    return <main style={styles.page}>Carregando resultado...</main>;
  }

  if (!submission) {
    return <main style={styles.page}>Resultado não encontrado.</main>;
  }

  return (
    <main style={styles.page}>
      <section style={styles.header}>
        <div>
          <h1>📄 Resultado da Avaliação</h1>
          <p>Aluno: <strong>{submission.student_name || "Não informado"}</strong></p>
          <p>Prova: <strong>{submission.exam_name || submission.book_name || "Avaliação"}</strong></p>
          <p>Protocolo: {submission.protocol || submission.id}</p>
        </div>

        <button onClick={printPage} style={styles.printButton}>
          📄 Salvar / Imprimir PDF
        </button>
      </section>

      <section style={styles.summary}>
        <div style={styles.box}><strong>{summary.total}</strong><span>Questões</span></div>
        <div style={styles.box}><strong>{summary.correct}</strong><span>Acertos</span></div>
        <div style={styles.box}><strong>{summary.wrong}</strong><span>Erros</span></div>
        <div style={styles.box}><strong>{submission.final_score ?? summary.score10}/10</strong><span>Nota</span></div>
      </section>

      {questions.map((question, index) => {
        const number = question.question_number || index + 1;
        const review = reviews[String(number)] || {};
        const correct = isCorrect(question);

        return (
          <article key={question.id || number} style={styles.question}>
            <h3>
              Questão {number} —{" "}
              {correct === true ? "✓ Correta" : correct === false ? "✗ Incorreta" : "Manual"}
            </h3>

            <p><strong>Pergunta:</strong> {getQuestionText(question)}</p>
            <p><strong>Resposta do aluno:</strong> {getStudentAnswer(question) || "Sem resposta"}</p>
            <p><strong>Resposta correta:</strong> {question.correct_answer || "Sem gabarito"}</p>

            {review.teacher_comment && (
              <p><strong>Observação do professor:</strong> {review.teacher_comment}</p>
            )}

            {review.ai_feedback && (
              <p><strong>Feedback:</strong> {review.ai_feedback}</p>
            )}
          </article>
        );
      })}
    </main>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "28px",
    fontFamily: "Arial, sans-serif",
    color: "#111827",
  },

  header: {
    background: "#fff",
    borderRadius: "16px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
    display: "flex",
    justifyContent: "space-between",
    gap: "16px",
    alignItems: "flex-start",
  },

  printButton: {
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 16px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginBottom: "18px",
  },

  box: {
    background: "#fff",
    borderRadius: "14px",
    padding: "16px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  question: {
    background: "#fff",
    borderRadius: "14px",
    padding: "18px",
    marginBottom: "14px",
    boxShadow: "0 8px 22px rgba(15,23,42,0.08)",
  },

  "@media print": {
    printButton: {
      display: "none",
    },
  },
};

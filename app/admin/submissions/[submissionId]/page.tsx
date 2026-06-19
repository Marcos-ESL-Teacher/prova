"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";
import { jsPDF } from "jspdf";

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

type ExamQuestion = {
  id: string;
  exam_id: string;
  question_number: number;
  question_type: string;
  question_text: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  option_e?: string | null;
  correct_answer?: string | null;
};

export default function SubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = params.submissionId as string;

  const [submission, setSubmission] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [blocks, setBlocks] = useState<ExamBlock[]>([]);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState<any>(null);
  const [mode, setMode] = useState<"blocks" | "questions">("questions");

  useEffect(() => {
    carregarDados();
  }, []);

  function normalizeAnswer(value: any) {
    return value?.toString().trim().toLowerCase() || "";
  }

  function isUUID(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      value
    );
  }

  function getAnswerLabel(value: any) {
    const text = value?.toString() || "";
    return text.length === 1 ? text.toUpperCase() : text;
  }

  function getBlockQuestionText(block: ExamBlock) {
    return block.content || "";
  }

  function getQuestionText(question: ExamQuestion) {
    return question.question_text || "";
  }

  function getQuestionBlocks() {
    return blocks.filter((block) => block.block_type === "question");
  }

  async function carregarDados() {
    setLoading(true);

    const { data: submissionData, error: submissionError } = await supabase
      .from("exam_submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (submissionError) {
      alert(submissionError.message);
      setLoading(false);
      return;
    }

    setSubmission(submissionData);

    if (submissionData.correction_status === "corrected") {
      setResultado({
        total:
          (submissionData.correct_count || 0) +
          (submissionData.wrong_count || 0),
        acertos: submissionData.correct_count || 0,
        erros: submissionData.wrong_count || 0,
        nota: submissionData.score || 0,
      });
    }

    if (submissionData.exam_id) {
      const { data: examData } = await supabase
        .from("exams")
        .select("*")
        .eq("id", submissionData.exam_id)
        .single();

      setExam(examData || null);

      const { data: blocksData, error: blocksError } = await supabase
        .from("exam_blocks")
        .select("*")
        .eq("exam_id", submissionData.exam_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (!blocksError && blocksData && blocksData.length > 0) {
        setBlocks(blocksData);
        setMode("blocks");
        setLoading(false);
        return;
      }
    }

    const answersObject = submissionData.answers || {};
    const questionIds = Object.keys(answersObject).filter((key) => isUUID(key));

    if (questionIds.length === 0) {
      setQuestions([]);
      setLoading(false);
      return;
    }

    const { data: questionsData, error: questionsError } = await supabase
      .from("exam_questions")
      .select("*")
      .in("id", questionIds)
      .order("question_number");

    if (questionsError) {
      alert(questionsError.message);
      setLoading(false);
      return;
    }

    setQuestions(questionsData || []);
    setMode("questions");
    setLoading(false);
  }

  function calcularResultado() {
    let total = 0;
    let acertos = 0;

    if (mode === "blocks") {
      getQuestionBlocks().forEach((block) => {
        total++;

        const respostaAluno = normalizeAnswer(submission.answers?.[block.id]);
        const respostaCorreta = normalizeAnswer(block.correct_answer);

        if (respostaAluno === respostaCorreta) {
          acertos++;
        }
      });
    } else {
      questions.forEach((q) => {
        total++;

        const respostaAluno = normalizeAnswer(submission.answers?.[q.id]);
        const respostaCorreta = normalizeAnswer(q.correct_answer);

        if (respostaAluno === respostaCorreta) {
          acertos++;
        }
      });
    }

    const erros = total - acertos;
    const nota = total > 0 ? Math.round((acertos / total) * 100) : 0;

    return { total, acertos, erros, nota };
  }

  async function corrigirTudo() {
    const resultadoFinal = calcularResultado();

    const { error } = await supabase
      .from("exam_submissions")
      .update({
        correct_count: resultadoFinal.acertos,
        wrong_count: resultadoFinal.erros,
        score: resultadoFinal.nota,
        correction_status: "corrected",
      })
      .eq("id", submissionId);

    if (error) {
      alert("Erro ao salvar correção: " + error.message);
      return;
    }

    setResultado(resultadoFinal);

    alert(
      `Correção salva!\n\nTotal: ${resultadoFinal.total}\nCorrect: ${resultadoFinal.acertos}\nMistakes: ${resultadoFinal.erros}\nResult: ${resultadoFinal.nota}%`
    );

    carregarDados();
  }

  async function excluirProva() {
    const confirmar = window.confirm(
      "Deseja realmente excluir esta prova enviada?\n\nEssa ação não poderá ser desfeita."
    );

    if (!confirmar) return;

    await supabase.from("exam_answers").delete().eq("submission_id", submissionId);

    const { error } = await supabase
      .from("exam_submissions")
      .delete()
      .eq("id", submissionId);

    if (error) {
      alert("Erro ao excluir prova: " + error.message);
      return;
    }

    alert("Prova excluída com sucesso.");
    router.push("/admin/submissions");
  }

  async function imageToBase64(url: string): Promise<string | null> {
    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const blob = await response.blob();

      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }

  async function getLogoBase64() {
    const possibleLogos = ["/logo.jpg", "/logo.jpeg", "/logo.png", "/logo.jpg.jpg"];

    for (const logoPath of possibleLogos) {
      const base64 = await imageToBase64(logoPath);
      if (base64) return base64;
    }

    return null;
  }

  function addNewPageIfNeeded(doc: jsPDF, y: number, neededSpace = 25) {
    if (y + neededSpace > 280) {
      doc.addPage();
      return 15;
    }

    return y;
  }

  function writeWrappedText(
    doc: jsPDF,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight = 5
  ) {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    return y + lines.length * lineHeight;
  }

  async function gerarPDF() {
    if (!submission) return alert("Dados da prova não carregados.");

    const resultadoFinal = calcularResultado();

    const doc = new jsPDF();
    let y = 15;

    const logoBase64 = await getLogoBase64();

    if (logoBase64) {
      doc.addImage(logoBase64, "JPEG", 14, 10, 32, 22);
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text("Corrected Digital Exam", 52, 18);

    doc.setFontSize(11);
    doc.text("Marcos Aulas Individuais de Inglês", 52, 26);
    doc.text("Learn English Since 2011", 52, 33);

    y = 45;

    doc.setLineWidth(0.4);
    doc.line(14, y, 196, y);
    y += 9;

    doc.setFontSize(11);
    doc.text(`Exam: ${exam?.title || submission.exam_name || ""}`, 14, y);
    y += 7;
    doc.text(`Student: ${submission.student_name || ""}`, 14, y);
    y += 7;
    doc.text(`WhatsApp: ${submission.student_phone || "Not informed"}`, 14, y);
    y += 7;
    doc.text(`Protocol: ${submission.protocol || ""}`, 14, y);
    y += 7;
    doc.text(`Date: ${new Date(submission.created_at).toLocaleString()}`, 14, y);
    y += 10;

    doc.setFontSize(13);
    doc.text(`Total: ${resultadoFinal.total}`, 14, y);
    doc.text(`Correct: ${resultadoFinal.acertos}`, 55, y);
    doc.text(`Mistakes: ${resultadoFinal.erros}`, 100, y);
    doc.text(`Result: ${resultadoFinal.nota}%`, 150, y);
    y += 10;

    doc.setLineWidth(0.3);
    doc.line(14, y, 196, y);
    y += 10;

    if (mode === "blocks") {
      blocks.forEach((block) => {
        y = addNewPageIfNeeded(doc, y, 22);

        if (block.block_type === "header") {
          doc.setFontSize(14);
          doc.setTextColor(0, 0, 0);
          if (block.title) {
            y = writeWrappedText(doc, block.title, 14, y, 180, 6);
          }
          if (block.content) {
            doc.setFontSize(10);
            y = writeWrappedText(doc, block.content, 14, y + 2, 180, 5);
          }
          y += 5;
          return;
        }

        if (block.block_type === "instruction") {
          doc.setFontSize(11);
          doc.setTextColor(37, 99, 235);
          if (block.title) {
            y = writeWrappedText(doc, block.title, 14, y, 180, 5);
          }
          doc.setFontSize(10);
          if (block.content) {
            y = writeWrappedText(doc, block.content, 14, y + 1, 180, 5);
          }
          y += 4;
          return;
        }

        if (block.block_type === "example") {
          doc.setFontSize(10);
          doc.setTextColor(120, 53, 15);
          const text = `${block.title || "Example"}: ${block.content || ""}`;
          y = writeWrappedText(doc, text, 14, y, 180, 5);
          y += 5;
          return;
        }

        if (block.block_type === "word_bank") {
          doc.setFontSize(11);
          doc.setTextColor(22, 101, 52);
          const text = `${block.title || "Word Bank"}: ${block.content || ""}`;
          y = writeWrappedText(doc, text, 14, y, 180, 5);
          y += 6;
          return;
        }

        if (block.block_type === "question") {
          y = addNewPageIfNeeded(doc, y, 50);

          const respostaAluno = submission.answers?.[block.id] || "";
          const respostaCorreta = block.correct_answer || "";
          const correta =
            normalizeAnswer(respostaAluno) === normalizeAnswer(respostaCorreta);

          const questionStartY = y;

          doc.setFontSize(12);
          doc.setTextColor(0, 0, 0);
          y = writeWrappedText(
            doc,
            `${block.question_number}. ${getBlockQuestionText(block)}`,
            14,
            y,
            150,
            6
          );

          doc.setFontSize(34);
          doc.setTextColor(correta ? 22 : 220, correta ? 163 : 38, correta ? 74 : 38);
          doc.text(correta ? "✓" : "✗", 178, questionStartY + 8);

          y += 2;

          if (block.question_type === "multiple_choice") {
            const options = [
              ["a", block.option_a],
              ["b", block.option_b],
              ["c", block.option_c],
              ["d", block.option_d],
              ["e", block.option_e],
            ];

            doc.setFontSize(10);

            options.forEach(([letter, text]) => {
              if (!text) return;

              y = addNewPageIfNeeded(doc, y, 12);

              const isStudent = normalizeAnswer(respostaAluno) === letter;
              const isCorrect = normalizeAnswer(respostaCorreta) === letter;

              let prefix = `${String(letter).toUpperCase()})`;

              if (isStudent && isCorrect) {
                prefix = `✓ ${String(letter).toUpperCase()})`;
                doc.setTextColor(22, 163, 74);
              } else if (isStudent && !isCorrect) {
                prefix = `✗ ${String(letter).toUpperCase()})`;
                doc.setTextColor(220, 38, 38);
              } else if (isCorrect) {
                prefix = `✓ ${String(letter).toUpperCase()})`;
                doc.setTextColor(22, 163, 74);
              } else {
                doc.setTextColor(0, 0, 0);
              }

              y = writeWrappedText(doc, `${prefix} ${text}`, 18, y, 160, 5);
              y += 1;
            });
          }

          if (block.question_type === "fill_blank") {
            doc.setFontSize(10);
            doc.setTextColor(correta ? 22 : 220, correta ? 163 : 38, correta ? 74 : 38);

            y = writeWrappedText(
              doc,
              `${correta ? "✓" : "✗"} Student Answer: ${String(respostaAluno)}`,
              18,
              y,
              160,
              5
            );

            doc.setTextColor(22, 163, 74);
            y = writeWrappedText(
              doc,
              `Correct Answer: ${String(respostaCorreta)}`,
              18,
              y + 1,
              160,
              5
            );
          }

          y += 3;

          doc.setFontSize(10);
          doc.setTextColor(correta ? 22 : 220, correta ? 163 : 38, correta ? 74 : 38);
          doc.text(correta ? "✓ CORRECT" : "✗ INCORRECT", 14, y);
          y += 7;

          doc.setTextColor(0, 0, 0);
          doc.setLineWidth(0.2);
          doc.line(14, y, 196, y);
          y += 8;
        }
      });
    } else {
      questions.forEach((q) => {
        y = addNewPageIfNeeded(doc, y, 50);

        const respostaAluno = submission.answers?.[q.id] || "";
        const respostaCorreta = q.correct_answer || "";
        const correta =
          normalizeAnswer(respostaAluno) === normalizeAnswer(respostaCorreta);

        const questionStartY = y;

        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        y = writeWrappedText(
          doc,
          `${q.question_number}. ${getQuestionText(q)}`,
          14,
          y,
          150,
          6
        );

        doc.setFontSize(34);
        doc.setTextColor(correta ? 22 : 220, correta ? 163 : 38, correta ? 74 : 38);
        doc.text(correta ? "✓" : "✗", 178, questionStartY + 8);

        y += 2;

        if (q.question_type === "multiple_choice") {
          const options = [
            ["a", q.option_a],
            ["b", q.option_b],
            ["c", q.option_c],
            ["d", q.option_d],
            ["e", q.option_e],
          ];

          doc.setFontSize(10);

          options.forEach(([letter, text]) => {
            if (!text) return;

            y = addNewPageIfNeeded(doc, y, 12);

            const isStudent = normalizeAnswer(respostaAluno) === letter;
            const isCorrect = normalizeAnswer(respostaCorreta) === letter;

            let prefix = `${String(letter).toUpperCase()})`;

            if (isStudent && isCorrect) {
              prefix = `✓ ${String(letter).toUpperCase()})`;
              doc.setTextColor(22, 163, 74);
            } else if (isStudent && !isCorrect) {
              prefix = `✗ ${String(letter).toUpperCase()})`;
              doc.setTextColor(220, 38, 38);
            } else if (isCorrect) {
              prefix = `✓ ${String(letter).toUpperCase()})`;
              doc.setTextColor(22, 163, 74);
            } else {
              doc.setTextColor(0, 0, 0);
            }

            y = writeWrappedText(doc, `${prefix} ${text}`, 18, y, 160, 5);
            y += 1;
          });
        }

        if (q.question_type === "fill_blank") {
          doc.setFontSize(10);
          doc.setTextColor(correta ? 22 : 220, correta ? 163 : 38, correta ? 74 : 38);
          y = writeWrappedText(
            doc,
            `${correta ? "✓" : "✗"} Student Answer: ${String(respostaAluno)}`,
            18,
            y,
            160,
            5
          );

          doc.setTextColor(22, 163, 74);
          y = writeWrappedText(
            doc,
            `Correct Answer: ${String(respostaCorreta)}`,
            18,
            y + 1,
            160,
            5
          );
        }

        y += 3;

        doc.setFontSize(10);
        doc.setTextColor(correta ? 22 : 220, correta ? 163 : 38, correta ? 74 : 38);
        doc.text(correta ? "✓ CORRECT" : "✗ INCORRECT", 14, y);
        y += 7;

        doc.setTextColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(14, y, 196, y);
        y += 8;
      });
    }

    y = addNewPageIfNeeded(doc, y, 35);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Final Result", 14, y);
    y += 8;

    doc.setFontSize(11);
    doc.text(`Total: ${resultadoFinal.total}`, 14, y);
    y += 7;
    doc.text(`Correct: ${resultadoFinal.acertos}`, 14, y);
    y += 7;
    doc.text(`Mistakes: ${resultadoFinal.erros}`, 14, y);
    y += 7;
    doc.text(`Result: ${resultadoFinal.nota}%`, 14, y);

    const safeName = (submission.student_name || "student")
      .replace(/\s+/g, "_")
      .replace(/[^\w-]/g, "");

    doc.save(`corrected_exam_${safeName}_${submission.protocol || submissionId}.pdf`);
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
      const respostaAluno = submission.answers?.[block.id] || "";
      const correta =
        normalizeAnswer(respostaAluno) === normalizeAnswer(block.correct_answer);

      return (
        <section
          key={block.id}
          style={{
            ...styles.questionCard,
            borderLeft: correta ? "8px solid #16a34a" : "8px solid #dc2626",
          }}
        >
          <h3>
            {block.question_number}. {block.content}
          </h3>

          {block.question_type === "multiple_choice" && (
            <div>
              <p>A) {block.option_a}</p>
              <p>B) {block.option_b}</p>
              <p>C) {block.option_c}</p>
              <p>D) {block.option_d}</p>
              {block.option_e && <p>E) {block.option_e}</p>}
            </div>
          )}

          <p>
            <strong>Resposta do aluno:</strong> {getAnswerLabel(respostaAluno)}
          </p>
          <p>
            <strong>Resposta correta:</strong> {getAnswerLabel(block.correct_answer)}
          </p>

          <p
            style={{
              color: correta ? "#16a34a" : "#dc2626",
              fontWeight: "bold",
            }}
          >
            {correta ? "✓ Correta" : "✗ Incorreta"}
          </p>
        </section>
      );
    }

    return null;
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <h2>Carregando...</h2>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1>👨‍🏫 Correção da Prova</h1>

      <div style={styles.infoCard}>
        <p>
          <strong>Aluno:</strong> {submission?.student_name}
        </p>
        <p>
          <strong>WhatsApp:</strong> {submission?.student_phone || "Não informado"}
        </p>
        <p>
          <strong>Prova:</strong> {exam?.title || submission?.exam_name || "Não informado"}
        </p>
        <p>
          <strong>Protocolo:</strong> {submission?.protocol}
        </p>
        <p>
          <strong>Status:</strong> {submission?.correction_status || "pending"}
        </p>
        <p>
          <strong>Data:</strong>{" "}
          {new Date(submission?.created_at).toLocaleString()}
        </p>
        <p>
          <strong>Modo:</strong>{" "}
          {mode === "blocks" ? "Prova digital completa (exam_blocks)" : "Questões antigas (exam_questions)"}
        </p>
      </div>

      <button onClick={corrigirTudo} style={styles.correctButton}>
        ✅ Conferir Tudo
      </button>

      <button onClick={gerarPDF} style={styles.pdfButton}>
        📄 Gerar Prova Corrigida PDF
      </button>

      <button onClick={excluirProva} style={styles.deleteButton}>
        🗑 Excluir Prova
      </button>

      {resultado && (
        <div style={styles.resultCard}>
          <h2>Resultado</h2>
          <p>
            <strong>Total:</strong> {resultado.total}
          </p>
          <p>
            <strong>Correct:</strong> {resultado.acertos}
          </p>
          <p>
            <strong>Mistakes:</strong> {resultado.erros}
          </p>
          <p>
            <strong>Result:</strong> {resultado.nota}%
          </p>
        </div>
      )}

      {mode === "blocks" && (
        <div>
          {blocks.map((block) => renderBlock(block))}
        </div>
      )}

      {mode === "questions" &&
        questions.map((q) => {
          const respostaAluno = submission.answers?.[q.id] || "";
          const correta =
            normalizeAnswer(respostaAluno) === normalizeAnswer(q.correct_answer);

          return (
            <div
              key={q.id}
              style={{
                ...styles.questionCard,
                borderLeft: correta ? "8px solid #16a34a" : "8px solid #dc2626",
              }}
            >
              <h3>
                {q.question_number}. {q.question_text}
              </h3>

              {q.question_type === "multiple_choice" && (
                <div>
                  <p>A) {q.option_a}</p>
                  <p>B) {q.option_b}</p>
                  <p>C) {q.option_c}</p>
                  <p>D) {q.option_d}</p>
                  {q.option_e && <p>E) {q.option_e}</p>}
                </div>
              )}

              <p>
                <strong>Resposta do aluno:</strong> {getAnswerLabel(respostaAluno)}
              </p>
              <p>
                <strong>Resposta correta:</strong> {getAnswerLabel(q.correct_answer)}
              </p>

              <p
                style={{
                  color: correta ? "#16a34a" : "#dc2626",
                  fontWeight: "bold",
                }}
              >
                {correta ? "✓ Correta" : "✗ Incorreta"}
              </p>
            </div>
          );
        })}
    </div>
  );
}

const styles: any = {
  page: {
    padding: "30px",
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },

  infoCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },

  resultCard: {
    background: "#ecfdf5",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid #86efac",
  },

  headerBlock: {
    background: "#f8fafc",
    padding: "18px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    marginBottom: "18px",
    textAlign: "center",
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

  questionCard: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "15px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },

  correctButton: {
    padding: "12px 18px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "20px",
    marginRight: "10px",
    fontWeight: "bold",
  },

  pdfButton: {
    padding: "12px 18px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "20px",
    marginRight: "10px",
    fontWeight: "bold",
  },

  deleteButton: {
    padding: "12px 18px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "20px",
    fontWeight: "bold",
  },
};

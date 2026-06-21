"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type ParserMode = "sbs" | "generic";
type OcrMode = "columns" | "full";

type ExamBlockDraft = {
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
  points?: number;
  is_active?: boolean;
};

type ExtractedOptions = {
  questionText: string;
  a?: string | null;
  b?: string | null;
  c?: string | null;
  d?: string | null;
  e?: string | null;
};

export default function ExamsAdminPage() {
  const [colecoes, setColecoes] = useState<any[]>([]);
  const [livros, setLivros] = useState<any[]>([]);
  const [pastas, setPastas] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [provas, setProvas] = useState<any[]>([]);

  const [colecaoSelecionada, setColecaoSelecionada] = useState<any>(null);
  const [livroSelecionado, setLivroSelecionado] = useState<any>(null);
  const [pastaSelecionada, setPastaSelecionada] = useState<any>(null);
  const [slotSelecionado, setSlotSelecionado] = useState<any>(null);
  const [provaSelecionada, setProvaSelecionada] = useState<any>(null);

  const [novaProva, setNovaProva] = useState("");
  const [descricao, setDescricao] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [rawText, setRawText] = useState("");
  const [blocks, setBlocks] = useState<ExamBlockDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [answerKeyStatus, setAnswerKeyStatus] = useState("");
  const [parserMode, setParserMode] = useState<ParserMode>("sbs");
  const [ocrMode, setOcrMode] = useState<OcrMode>("columns");
  const [showImporter, setShowImporter] = useState(false);

  useEffect(() => {
    carregarColecoes();
  }, []);

  async function carregarColecoes() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("book_collections")
      .select("*")
      .order("sort_order", { ascending: true });

    setCarregando(false);

    if (error) return alert(error.message);
    setColecoes(data || []);
  }

  async function abrirColecao(colecao: any) {
    setColecaoSelecionada(colecao);
    setLivroSelecionado(null);
    setPastaSelecionada(null);
    setSlotSelecionado(null);
    setProvaSelecionada(null);
    setShowImporter(false);
    setLivros([]);
    setPastas([]);
    setSlots([]);
    setProvas([]);
    resetImporter();

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("collection_id", colecao.id)
      .order("sort_order", { ascending: true });

    if (error) return alert(error.message);
    setLivros(data || []);
  }

  async function abrirLivro(livro: any) {
    setLivroSelecionado(livro);
    setPastaSelecionada(null);
    setSlotSelecionado(null);
    setProvaSelecionada(null);
    setShowImporter(false);
    setPastas([]);
    setSlots([]);
    setProvas([]);
    resetImporter();

    const { data, error } = await supabase
      .from("book_folders")
      .select("*")
      .eq("book_id", livro.id)
      .order("sort_order", { ascending: true });

    if (error) return alert(error.message);
    setPastas(data || []);
  }

  async function abrirPasta(pasta: any) {
    setPastaSelecionada(pasta);
    setSlotSelecionado(null);
    setProvaSelecionada(null);
    setShowImporter(false);
    setSlots([]);
    setProvas([]);
    resetImporter();

    const { data, error } = await supabase
      .from("exam_slots")
      .select("*")
      .eq("folder_id", pasta.id)
      .order("sort_order", { ascending: true });

    if (error) return alert(error.message);
    setSlots(data || []);
  }

  async function abrirSlot(slot: any) {
    setSlotSelecionado(slot);
    setProvaSelecionada(null);
    setShowImporter(false);
    setProvas([]);
    resetImporter();

    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("slot_id", slot.id)
      .order("sort_order", { ascending: true });

    if (error) return alert(error.message);
    setProvas(data || []);
  }

  async function adicionarSlot() {
    if (!pastaSelecionada) {
      alert("Selecione uma pasta primeiro.");
      return;
    }

    const nome = prompt("Nome do novo slot:", `Slot ${slots.length + 1}`);
    if (!nome || !nome.trim()) return;

    const proximaOrdem =
      slots.length > 0
        ? Math.max(...slots.map((slot) => Number(slot.sort_order || 0))) + 1
        : 1;

    const { error } = await supabase.from("exam_slots").insert([
      {
        folder_id: pastaSelecionada.id,
        name: nome.trim(),
        sort_order: proximaOrdem,
      },
    ]);

    if (error) {
      alert("Erro ao adicionar slot: " + error.message);
      return;
    }

    await abrirPasta(pastaSelecionada);
  }

  async function renomearSlot(slot: any) {
    const novoNome = prompt("Novo nome do slot:", slot.name);
    if (!novoNome || !novoNome.trim()) return;

    const { error } = await supabase
      .from("exam_slots")
      .update({ name: novoNome.trim() })
      .eq("id", slot.id);

    if (error) {
      alert("Erro ao renomear slot: " + error.message);
      return;
    }

    await abrirPasta(pastaSelecionada);
  }

  async function excluirSlot(slot: any) {
    const confirmar = confirm(
      `Tem certeza que deseja excluir o slot "${slot.name}"?\n\nSe houver provas dentro dele, o Supabase pode impedir a exclusão.`
    );

    if (!confirmar) return;

    const { error } = await supabase.from("exam_slots").delete().eq("id", slot.id);

    if (error) {
      alert("Erro ao excluir slot: " + error.message);
      return;
    }

    setSlotSelecionado(null);
    setProvaSelecionada(null);
    setShowImporter(false);
    setProvas([]);
    resetImporter();
    await abrirPasta(pastaSelecionada);
  }

  async function adicionarProva() {
    if (!slotSelecionado) return alert("Selecione um slot primeiro.");
    if (!novaProva.trim()) return alert("Digite o nome da prova.");

    const proximaOrdem =
      provas.length > 0
        ? Math.max(...provas.map((prova) => Number(prova.sort_order || 0))) + 1
        : 1;

    const { error } = await supabase.from("exams").insert([
      {
        slot_id: slotSelecionado.id,
        title: novaProva.trim(),
        description: descricao.trim(),
        sort_order: proximaOrdem,
        is_active: true,
      },
    ]);

    if (error) return alert(error.message);

    setNovaProva("");
    setDescricao("");
    await abrirSlot(slotSelecionado);
  }

  async function excluirProva(id: string) {
    const confirmar = confirm("Tem certeza que deseja excluir esta prova?");
    if (!confirmar) return;

    const { error } = await supabase.from("exams").delete().eq("id", id);

    if (error) return alert(error.message);

    if (provaSelecionada?.id === id) {
      setProvaSelecionada(null);
      setShowImporter(false);
      resetImporter();
    }

    await abrirSlot(slotSelecionado);
  }

  async function renomearProva(prova: any) {
    const novoNome = prompt("Novo nome da prova:", prova.title);
    if (!novoNome || !novoNome.trim()) return;

    const novaDescricao = prompt(
      "Nova descrição da prova:",
      prova.description || ""
    );

    const { error } = await supabase
      .from("exams")
      .update({
        title: novoNome.trim(),
        description: novaDescricao || "",
      })
      .eq("id", prova.id);

    if (error) return alert(error.message);
    await abrirSlot(slotSelecionado);
  }

  function selecionarProvaParaImportar(prova: any) {
    setProvaSelecionada(prova);
    setShowImporter(true);
    resetImporter();
    setTimeout(() => {
      document.getElementById("importador-integrado")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function getStudentLink(provaId: string) {
    return `${window.location.origin}/student/exam-blocks/${provaId}`;
  }

  async function copiarLink(prova: any) {
    const link = getStudentLink(prova.id);

    try {
      await navigator.clipboard.writeText(link);
      alert("Link da prova copiado!");
    } catch {
      prompt("Copie o link da prova:", link);
    }
  }

  function enviarWhatsApp(prova: any) {
    const link = getStudentLink(prova.id);

    const mensagem = `Olá!

Segue o link da sua prova:

${prova.title}

${link}`;

    const url = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(url, "_blank");
  }

  function enviarEmail(prova: any) {
    const link = getStudentLink(prova.id);
    const subject = encodeURIComponent(`Prova: ${prova.title}`);
    const body = encodeURIComponent(`Olá!

Segue o link da sua prova:

${prova.title}

${link}`);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  function abrirAluno(prova: any) {
    window.open(`/student/exam-blocks/${prova.id}`, "_blank");
  }

  function itemStyle(ativo: boolean) {
    return {
      ...styles.item,
      ...(ativo ? styles.itemActive : {}),
    };
  }

  function resetImporter() {
    setRawText("");
    setBlocks([]);
    setOcrStatus("");
    setAnswerKeyStatus("");
    setOcrRunning(false);
    setSaving(false);
  }

  function cleanLine(line: string) {
    return line
      .replace(/\t/g, " ")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeOcrText(text: string) {
    return text
      .replace(/\r/g, "\n")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\u00a0/g, " ")
      .replace(/[|]/g, " ")
      .replace(/\s+(\d{1,2})[\.)]\s+(?=[A-Z])/g, "\n$1. ")
      .replace(/\s+([a-e])[\.)]\s+/g, "\n$1. ")
      .replace(/\n{3,}/g, "\n\n");
  }

  function isPageMarker(line: string) {
    return line.startsWith("--- PAGE");
  }

  function isQuestionLine(line: string) {
    return /^\d{1,2}[\.\)]\s+/.test(line);
  }

  function isOptionLine(line: string) {
    return /^[A-Ea-e][\).]\s+/.test(line);
  }

  function parseOption(line: string) {
    const letter = line.charAt(0).toLowerCase();

    const text = cleanLine(
      line
        .slice(1)
        .replace(/^[\).]\s*/, "")
        .replace(/^\s+/, "")
    );

    return { letter, text };
  }

  function looksLikeHeader(line: string) {
    const lower = line.toLowerCase();

    return (
      lower.includes("side by side") ||
      lower.includes("book ") ||
      lower.includes("chapter") ||
      lower.includes("test") ||
      lower.includes("quiz")
    );
  }

  function looksLikeStudentInfo(line: string) {
    const lower = line.toLowerCase();

    return (
      lower.includes("student") ||
      lower.includes("course") ||
      lower.includes("teacher") ||
      lower.includes("date") ||
      lower.includes("i.d.") ||
      lower.includes("id number") ||
      lower.includes("score")
    );
  }

  function isSbsSection(line: string) {
    const lower = line.toLowerCase();

    return (
      lower === "choose" ||
      lower.includes("choose") ||
      lower.includes("which word doesn't belong") ||
      lower.includes("which word doesnt belong") ||
      lower.includes("which word doesn") ||
      lower.includes("which word?") ||
      lower === "which word"
    );
  }

  function isExampleLine(line: string) {
    return line.toLowerCase().includes("example");
  }

  function getSectionQuestionType(section: string, questionText: string) {
    const lowerSection = section.toLowerCase();
    const lowerQuestion = questionText.toLowerCase();

    if (
      lowerSection.includes("which word") ||
      lowerQuestion.includes("_____") ||
      lowerQuestion.includes("____") ||
      lowerQuestion.includes("___")
    ) {
      return "multiple_choice";
    }

    return "multiple_choice";
  }

  async function recognizeCanvas(canvas: HTMLCanvasElement, label: string) {
    const Tesseract = await import("tesseract.js");

    const result = await Tesseract.recognize(canvas, "eng", {
      logger: (m: any) => {
        if (m.status === "recognizing text") {
          const percent = Math.round((m.progress || 0) * 100);
          setOcrStatus(`${label}: ${percent}%`);
        }
      },
    });

    return result.data.text;
  }


  async function extractTextFromImage(file: File) {
    try {
      setOcrRunning(true);
      setOcrStatus("Lendo imagem...");

      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      const imageLoaded = new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Não foi possível carregar a imagem."));
      });

      image.src = objectUrl;
      await imageLoaded;

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Não foi possível criar o canvas para OCR da imagem.");
      }

      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);

      const text = await recognizeCanvas(canvas, "OCR imagem");

      setRawText(normalizeOcrText(text.trim()));
      setOcrStatus("Imagem processada com sucesso. Revise o texto abaixo e clique em Gerar Blocos.");
    } catch (error: any) {
      alert("Erro ao processar imagem: " + (error?.message || String(error)));
      setOcrStatus("Erro ao processar imagem.");
    } finally {
      setOcrRunning(false);
    }
  }

  function cropCanvas(
    sourceCanvas: HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Não foi possível criar canvas recortado.");
    }

    canvas.width = width;
    canvas.height = height;

    context.drawImage(sourceCanvas, x, y, width, height, 0, 0, width, height);

    return canvas;
  }

  async function extractTextFromPdfWithOcr(file: File) {
    try {
      setOcrRunning(true);
      setOcrStatus("Lendo PDF...");

      const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setOcrStatus(`Convertendo página ${pageNumber} de ${pdf.numPages}...`);

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2.8 });

        const fullCanvas = document.createElement("canvas");
        const fullContext = fullCanvas.getContext("2d");

        if (!fullContext) {
          throw new Error("Não foi possível criar o canvas para OCR.");
        }

        fullCanvas.width = viewport.width;
        fullCanvas.height = viewport.height;

        await page.render({
          canvasContext: fullContext,
          viewport,
        }).promise;

        if (ocrMode === "columns") {
          const topCut = Math.floor(fullCanvas.height * 0.13);
          const bottomCut = Math.floor(fullCanvas.height * 0.95);
          const usableHeight = bottomCut - topCut;
          const middle = Math.floor(fullCanvas.width / 2);

          const leftCanvas = cropCanvas(
            fullCanvas,
            0,
            topCut,
            middle,
            usableHeight
          );

          const rightCanvas = cropCanvas(
            fullCanvas,
            middle,
            topCut,
            fullCanvas.width - middle,
            usableHeight
          );

          const leftText = await recognizeCanvas(
            leftCanvas,
            `OCR página ${pageNumber}/${pdf.numPages} esquerda`
          );

          const rightText = await recognizeCanvas(
            rightCanvas,
            `OCR página ${pageNumber}/${pdf.numPages} direita`
          );

          fullText += `\n\n--- PAGE ${pageNumber} LEFT ---\n\n${leftText}`;
          fullText += `\n\n--- PAGE ${pageNumber} RIGHT ---\n\n${rightText}`;
        } else {
          const pageText = await recognizeCanvas(
            fullCanvas,
            `OCR página ${pageNumber}/${pdf.numPages}`
          );

          fullText += `\n\n--- PAGE ${pageNumber} FULL ---\n\n${pageText}`;
        }
      }

      setRawText(normalizeOcrText(fullText.trim()));
      setOcrStatus("OCR concluído. Revise o texto abaixo e clique em Gerar Blocos.");
    } catch (error: any) {
      alert("Erro no OCR: " + (error?.message || String(error)));
      setOcrStatus("Erro ao fazer OCR.");
    } finally {
      setOcrRunning(false);
    }
  }


  async function extractTextFromTeacherPdf(file: File) {
    try {
      if (!provaSelecionada?.id) {
        alert("Selecione uma prova antes de importar o espelho.");
        return;
      }

      setAnswerKeyStatus("Lendo Teacher PDF / espelho...");

      const pdfjsLib: any = await import("pdfjs-dist/legacy/build/pdf.mjs");

      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.mjs",
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let fullText = "";

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        setAnswerKeyStatus(`Lendo espelho página ${pageNumber}/${pdf.numPages}...`);

        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
          .map((item: any) => item.str || "")
          .join(" ");

        fullText += `\n\n--- PAGE ${pageNumber} ---\n\n${pageText}`;
      }

      const answers = parseTeacherAnswerKey(fullText);

      if (answers.length === 0) {
        setAnswerKeyStatus(
          "Nenhuma resposta encontrada. Verifique se o PDF tem padrão ANS: ou Answer Strip."
        );
        return;
      }

      await applyAnswerKeyToExamBlocks(answers);

      setAnswerKeyStatus(
        `Espelho importado com sucesso: ${answers.length} respostas aplicadas.`
      );

      alert(`Espelho importado: ${answers.length} respostas aplicadas.`);
    } catch (error: any) {
      alert("Erro ao importar espelho: " + (error?.message || String(error)));
      setAnswerKeyStatus("Erro ao importar Teacher PDF / espelho.");
    }
  }

  function parseTeacherAnswerKey(text: string) {
    const cleaned = text
      .replace(/\r/g, "\n")
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const answerMap = new Map<
      number,
      {
        questionNumber: number;
        correctAnswer: string;
        points: number;
      }
    >();

    /*
      Padrão principal dos PDFs Teacher:
      1. ANS: experienced PTS: 1
      41. ANS: were playing, took PTS: 2
    */
    const mainRegex =
      /(?:^|\s)(\d{1,3})\.\s*ANS:\s*([\s\S]*?)(?=\s+PTS:\s*\d|\s+\d{1,3}\.\s*ANS:|$)/g;

    let match: RegExpExecArray | null;

    while ((match = mainRegex.exec(cleaned)) !== null) {
      const questionNumber = Number(match[1]);
      let correctAnswer = cleanAnswerKeyValue(match[2]);
      const after = cleaned.slice(match.index, match.index + 500);
      const pointsMatch = after.match(/PTS:\s*(\d+(?:\.\d+)?)/);
      const points = pointsMatch ? Number(pointsMatch[1]) : 1;

      if (!questionNumber || !correctAnswer) continue;

      answerMap.set(questionNumber, {
        questionNumber,
        correctAnswer,
        points,
      });
    }

    /*
      Padrão Answer Strip:
      _____ 21. C
      _____ 22. A
    */
    const stripRegex = /_{2,}\s*(\d{1,3})\.\s*([A-Ea-eTFtf])(?:\s|$)/g;

    while ((match = stripRegex.exec(cleaned)) !== null) {
      const questionNumber = Number(match[1]);
      const correctAnswer = match[2].toUpperCase();

      if (!questionNumber || !correctAnswer) continue;

      if (!answerMap.has(questionNumber)) {
        answerMap.set(questionNumber, {
          questionNumber,
          correctAnswer,
          points: 1,
        });
      }
    }

    return Array.from(answerMap.values()).sort(
      (a, b) => a.questionNumber - b.questionNumber
    );
  }

  function cleanAnswerKeyValue(value: string) {
    let answer = cleanLine(value)
      .replace(/\s*REF:.*$/i, "")
      .replace(/\s*OBJ:.*$/i, "")
      .replace(/\s*TOP:.*$/i, "")
      .replace(/\s*ID:.*$/i, "")
      .replace(/\s*Name:.*$/i, "")
      .replace(/\s*Answer Section.*$/i, "")
      .replace(/\s*Life\s*-\s*Book.*$/i, "")
      .trim();

    /*
      Quando o Teacher PDF traz alternativas aceitas em linhas separadas:
      56. ANS:
      ship
      ferry
      boat
      PTS: 1

      O texto extraído pode virar "ship ferry boat".
      Para casos conhecidos, mantemos múltiplas respostas usando " | ".
      O corretor aceita qualquer item separado por "|".
    */
    const commonMultipleAnswers: Record<string, string> = {
      "ship ferry boat": "ship | ferry | boat",
      "fell slipped": "fell | slipped",
    };

    const lower = answer.toLowerCase();

    if (commonMultipleAnswers[lower]) {
      answer = commonMultipleAnswers[lower];
    }

    return answer;
  }

  async function applyAnswerKeyToExamBlocks(
    answers: Array<{ questionNumber: number; correctAnswer: string; points: number }>
  ) {
    if (!provaSelecionada?.id) {
      throw new Error("Nenhuma prova selecionada.");
    }

    let updated = 0;

    for (const item of answers) {
      const { error } = await supabase
        .from("exam_blocks")
        .update({
          correct_answer: item.correctAnswer,
          points: item.points || 1,
        })
        .eq("exam_id", provaSelecionada.id)
        .eq("block_type", "question")
        .eq("question_number", item.questionNumber);

      if (error) {
        throw error;
      }

      updated++;
    }

    return updated;
  }

  function makeHeaderBlock(title: string, sort: number): ExamBlockDraft {
    return {
      block_type: "header",
      sort_order: sort,
      title,
      content: null,
      points: 0,
      is_active: true,
    };
  }

  function makeInstructionBlock(title: string, content: string, sort: number): ExamBlockDraft {
    return {
      block_type: "instruction",
      sort_order: sort,
      title,
      content,
      points: 0,
      is_active: true,
    };
  }

  function makeExampleBlock(content: string, sort: number): ExamBlockDraft {
    return {
      block_type: "example",
      sort_order: sort,
      title: "Example",
      content,
      points: 0,
      is_active: true,
    };
  }

  function makeQuestionBlock(
    questionNumber: number | null,
    content: string,
    questionType: string,
    sort: number
  ): ExamBlockDraft {
    return {
      block_type: "question",
      sort_order: sort,
      title: null,
      content,
      question_number: questionNumber,
      question_type: questionType,
      option_a: null,
      option_b: null,
      option_c: null,
      option_d: null,
      option_e: null,
      correct_answer: "",
      points: 1,
      is_active: true,
    };
  }

  function setOptionOnQuestion(question: ExamBlockDraft, letter: string, text: string) {
    if (letter === "a") question.option_a = text;
    if (letter === "b") question.option_b = text;
    if (letter === "c") question.option_c = text;
    if (letter === "d") question.option_d = text;
    if (letter === "e") question.option_e = text;
    question.question_type = "multiple_choice";
  }

  function generateBlocksGeneric() {
    const lines = normalizeOcrText(rawText)
      .split("\n")
      .map(cleanLine)
      .filter(Boolean)
      .filter((line) => !isPageMarker(line));

    const generated: ExamBlockDraft[] = [];
    let sort = 1;
    let currentQuestion: ExamBlockDraft | null = null;
    let currentSectionTitle = "";

    function flush() {
      if (currentQuestion) {
        generated.push(currentQuestion);
        currentQuestion = null;
      }
    }

    for (const line of lines) {
      const lower = line.toLowerCase();

      if (looksLikeHeader(line)) {
        flush();
        generated.push(makeHeaderBlock(line, sort++));
        continue;
      }

      if (isSbsSection(line) || lower.includes("complete the")) {
        flush();
        currentSectionTitle = line;
        generated.push(makeInstructionBlock(line, line, sort++));
        continue;
      }

      if (isExampleLine(line)) {
        flush();
        generated.push(makeExampleBlock(line, sort++));
        continue;
      }

      if (isQuestionLine(line)) {
        flush();

        const match = line.match(/^(\d{1,2})[\.\)]\s+(.*)$/);
        const number = match ? Number(match[1]) : null;
        const questionText = match ? match[2] : line;

        currentQuestion = makeQuestionBlock(
          number,
          questionText,
          getSectionQuestionType(currentSectionTitle, questionText),
          sort++
        );
        continue;
      }

      if (isOptionLine(line) && currentQuestion) {
        const { letter, text } = parseOption(line);
        setOptionOnQuestion(currentQuestion, letter, text);
        continue;
      }

      if (currentQuestion) {
        currentQuestion.content = `${currentQuestion.content} ${line}`;
        continue;
      }

      if (!looksLikeStudentInfo(line)) {
        generated.push(makeInstructionBlock("", line, sort++));
      }
    }

    flush();
    setBlocks(normalizeSortOrder(postProcessSbsBlocks(generated)));
  }

  function generateBlocksSbs() {
    const lines = normalizeOcrText(rawText)
      .split("\n")
      .map(cleanLine)
      .filter(Boolean)
      .filter((line) => !isPageMarker(line))
      .filter((line) => !looksLikeStudentInfo(line))
      .filter((line) => !line.toLowerCase().includes("page "));

    const generated: ExamBlockDraft[] = [];
    let sort = 1;
    let section = "";
    let currentQuestion: ExamBlockDraft | null = null;
    let headerCreated = false;
    let collectingExample = false;
    let exampleBuffer: string[] = [];

    function flushExample() {
      if (exampleBuffer.length > 0) {
        generated.push(makeExampleBlock(exampleBuffer.join(" "), sort++));
        exampleBuffer = [];
        collectingExample = false;
      }
    }

    function flushQuestion() {
      if (currentQuestion) {
        generated.push(currentQuestion);
        currentQuestion = null;
      }
    }

    function flushAll() {
      flushExample();
      flushQuestion();
    }

    for (const line of lines) {
      if (looksLikeHeader(line) && !headerCreated) {
        flushAll();
        generated.push(makeHeaderBlock(cleanHeaderTitle(line), sort++));
        headerCreated = true;
        continue;
      }

      if (isSbsSection(line)) {
        flushAll();
        section = cleanSectionTitle(line);
        generated.push(makeInstructionBlock(section, getSectionDescription(section), sort++));
        continue;
      }

      if (isExampleLine(line)) {
        flushAll();
        collectingExample = true;
        exampleBuffer = [line];
        continue;
      }

      if (collectingExample) {
        if (isQuestionLine(line) || isSbsSection(line)) {
          flushExample();
        } else {
          exampleBuffer.push(line);
          continue;
        }
      }

      if (isQuestionLine(line)) {
        flushQuestion();

        const match = line.match(/^(\d{1,2})[\.\)]\s+(.*)$/);
        const number = match ? Number(match[1]) : null;
        const questionText = match ? match[2] : line;

        currentQuestion = makeQuestionBlock(
          number,
          questionText,
          getSectionQuestionType(section, questionText),
          sort++
        );

        continue;
      }

      if (isOptionLine(line) && currentQuestion) {
        const { letter, text } = parseOption(line);
        setOptionOnQuestion(currentQuestion, letter, text);
        continue;
      }

      if (currentQuestion) {
        currentQuestion.content = `${currentQuestion.content} ${line}`;
        continue;
      }

      if (looksLikeWhichWordOptionLine(line)) {
        generated.push({
          block_type: "word_bank",
          sort_order: sort++,
          title: "Which Word?",
          content: line,
          points: 0,
          is_active: true,
        });
        continue;
      }

      if (line.length > 2 && !looksLikeStudentInfo(line)) {
        generated.push(makeInstructionBlock("", line, sort++));
      }
    }

    flushAll();
    setBlocks(normalizeSortOrder(postProcessSbsBlocks(generated)));
  }

  function cleanHeaderTitle(line: string) {
    const cleaned = cleanLine(line)
      .replace(/['"]/g, "")
      .replace(/\(\s*/g, "")
      .replace(/\s*\)/g, "");

    if (cleaned.toLowerCase().includes("chapter")) return cleaned;

    return cleaned || "SBS Test";
  }

  function cleanSectionTitle(line: string) {
    const lower = line.toLowerCase();

    if (lower.includes("which word doesn't belong") || lower.includes("which word doesnt belong")) {
      return "WHICH WORD DOESN'T BELONG?";
    }

    if (lower.includes("which word")) {
      return "WHICH WORD?";
    }

    if (lower.includes("choose")) {
      return "CHOOSE";
    }

    return line.toUpperCase();
  }

  function getSectionDescription(section: string) {
    const lower = section.toLowerCase();

    if (lower.includes("which word doesn't belong") || lower.includes("which word doesnt belong")) {
      return "Choose the word or phrase that doesn't belong.";
    }

    if (lower.includes("which word")) {
      return "Choose the correct word or phrase.";
    }

    if (lower.includes("choose")) {
      return "Choose the word or phrase that best completes each item.";
    }

    return section;
  }

  function looksLikeWhichWordOptionLine(line: string) {
    const lower = line.toLowerCase();

    const hits = [
      "had happened",
      "is happened",
      "happened",
      "had broken",
      "broke",
      "were breaking",
      "taking",
      "take to",
      "to take",
      "weren",
      "had been",
      "been thinking",
      "considered",
      "decided",
    ].filter((word) => lower.includes(word)).length;

    return hits >= 2;
  }

  function postProcessSbsBlocks(inputBlocks: ExamBlockDraft[]) {
    const output: ExamBlockDraft[] = [];

    inputBlocks.forEach((block) => {
      if (block.block_type !== "question") {
        output.push(block);
        return;
      }

      const content = block.content || "";
      const embeddedOptions = extractEmbeddedOptions(content);

      if (embeddedOptions) {
        output.push({
          ...block,
          content: embeddedOptions.questionText,
          question_type: "multiple_choice",
          option_a: embeddedOptions.a || block.option_a,
          option_b: embeddedOptions.b || block.option_b,
          option_c: embeddedOptions.c || block.option_c,
          option_d: embeddedOptions.d || block.option_d,
          option_e: embeddedOptions.e || block.option_e,
        });
        return;
      }

      output.push(block);
    });

    return mergeBrokenOptionBlocks(output);
  }

  function extractEmbeddedOptions(text: string): ExtractedOptions | null {
    const normalized = cleanLine(text);

    const expanded = normalized
      .replace(/\s([A-Ea-e])\s+(?=[A-Z0-9"'])/g, " $1. ")
      .replace(/\s([A-Ea-e])\)(?=\s*[A-Z0-9"'])/g, " $1. ")
      .replace(/\s([A-Ea-e])\.(?=\s*[A-Z0-9"'])/g, " $1. ");

    const markers: Array<{ letter: string; index: number; length: number }> = [];
    const regex = /(?:^|\s)([A-Ea-e])[\).]\s+/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(expanded)) !== null) {
      const markerText = match[0];
      const letter = match[1].toLowerCase();

      const letterPositionInsideMarker = markerText.search(/[A-Ea-e]/);
      const index = match.index + letterPositionInsideMarker;
      const length = markerText.length - letterPositionInsideMarker;

      markers.push({
        letter,
        index,
        length,
      });
    }

    const sequence = findBestOptionSequence(markers);

    if (!sequence) return null;

    const firstA = sequence[0];

    if (firstA.index < 5) return null;

    const questionText = cleanLine(expanded.slice(0, firstA.index));

    if (!questionText || questionText.length < 3) return null;

    const result: ExtractedOptions = {
      questionText,
      a: null,
      b: null,
      c: null,
      d: null,
      e: null,
    };

    sequence.forEach((marker, position) => {
      const start = marker.index + marker.length;
      const end =
        position + 1 < sequence.length
          ? sequence[position + 1].index
          : expanded.length;

      const optionText = cleanLine(expanded.slice(start, end));

      if (!optionText) return;

      if (marker.letter === "a") result.a = optionText;
      if (marker.letter === "b") result.b = optionText;
      if (marker.letter === "c") result.c = optionText;
      if (marker.letter === "d") result.d = optionText;
      if (marker.letter === "e") result.e = optionText;
    });

    if (!result.a || !result.b || !result.c || !result.d) return null;

    return result;
  }

  function findBestOptionSequence(
    markers: Array<{ letter: string; index: number; length: number }>
  ) {
    if (markers.length < 4) return null;

    const letters = ["a", "b", "c", "d", "e"];

    for (let i = 0; i < markers.length; i++) {
      if (markers[i].letter !== "a") continue;

      const sequence = [markers[i]];
      let expectedIndex = 1;

      for (let j = i + 1; j < markers.length; j++) {
        if (markers[j].letter === letters[expectedIndex]) {
          sequence.push(markers[j]);
          expectedIndex++;

          if (expectedIndex >= 4) {
            if (
              expectedIndex < letters.length &&
              j + 1 < markers.length &&
              markers[j + 1].letter === letters[expectedIndex]
            ) {
              sequence.push(markers[j + 1]);
            }

            return sequence;
          }
        }
      }
    }

    return null;
  }

  function mergeBrokenOptionBlocks(items: ExamBlockDraft[]) {
    const output: ExamBlockDraft[] = [];

    items.forEach((block) => {
      if (block.block_type !== "instruction" || !block.content) {
        output.push(block);
        return;
      }

      const line = block.content;

      if (isOptionLine(line)) {
        const previousQuestion = [...output]
          .reverse()
          .find((candidate) => candidate.block_type === "question");

        if (previousQuestion) {
          const { letter, text } = parseOption(line);
          setOptionOnQuestion(previousQuestion, letter, text);
          return;
        }
      }

      output.push(block);
    });

    return output;
  }

  function normalizeSortOrder(items: ExamBlockDraft[]) {
    return items.map((item, index) => ({
      ...item,
      sort_order: index + 1,
    }));
  }

  function generateBlocks() {
    if (!provaSelecionada) {
      alert("Selecione uma prova antes de gerar blocos.");
      return;
    }

    if (!rawText.trim()) {
      alert("Faça OCR do PDF ou cole o texto antes de gerar blocos.");
      return;
    }

    if (parserMode === "sbs") {
      generateBlocksSbs();
    } else {
      generateBlocksGeneric();
    }
  }

  function updateBlock(index: number, field: keyof ExamBlockDraft, value: any) {
    setBlocks((prev) =>
      prev.map((block, i) =>
        i === index
          ? {
              ...block,
              [field]: value,
            }
          : block
      )
    );
  }

  function moveBlock(index: number, direction: "up" | "down") {
    setBlocks((prev) => {
      const copy = [...prev];
      const target = direction === "up" ? index - 1 : index + 1;

      if (target < 0 || target >= copy.length) return prev;

      const temp = copy[index];
      copy[index] = copy[target];
      copy[target] = temp;

      return normalizeSortOrder(copy);
    });
  }

  function deleteBlock(index: number) {
    const confirmar = window.confirm("Deseja remover este bloco da prévia?");
    if (!confirmar) return;

    setBlocks((prev) => normalizeSortOrder(prev.filter((_, i) => i !== index)));
  }

  function addQuestionBlock() {
    setBlocks((prev) => [
      ...prev,
      {
        block_type: "question",
        sort_order: prev.length + 1,
        title: null,
        content: "",
        question_number:
          prev.filter((block) => block.block_type === "question").length + 1,
        question_type: "multiple_choice",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        option_e: "",
        correct_answer: "",
        points: 1,
        is_active: true,
      },
    ]);
  }

  function addInstructionBlock() {
    setBlocks((prev) => [
      ...prev,
      {
        block_type: "instruction",
        sort_order: prev.length + 1,
        title: "",
        content: "",
        points: 0,
        is_active: true,
      },
    ]);
  }

  function addExampleBlock() {
    setBlocks((prev) => [
      ...prev,
      {
        block_type: "example",
        sort_order: prev.length + 1,
        title: "Example",
        content: "",
        points: 0,
        is_active: true,
      },
    ]);
  }

  function addWordBankBlock() {
    setBlocks((prev) => [
      ...prev,
      {
        block_type: "word_bank",
        sort_order: prev.length + 1,
        title: "Word Bank",
        content: "",
        points: 0,
        is_active: true,
      },
    ]);
  }

  function renumberQuestions() {
    let counter = 1;

    setBlocks((prev) =>
      prev.map((block) => {
        if (block.block_type !== "question") return block;

        const updated = {
          ...block,
          question_number: counter,
        };

        counter++;
        return updated;
      })
    );
  }

  async function saveBlocks() {
    if (!provaSelecionada?.id) {
      alert("Selecione uma prova.");
      return;
    }

    if (blocks.length === 0) {
      alert("Gere os blocos antes de salvar.");
      return;
    }

    const confirmDelete = window.confirm(
      "Isso vai apagar os blocos digitais atuais desta prova e salvar os novos.\n\nDeseja continuar?"
    );

    if (!confirmDelete) return;

    setSaving(true);

    const { error: deleteError } = await supabase
      .from("exam_blocks")
      .delete()
      .eq("exam_id", provaSelecionada.id);

    if (deleteError) {
      setSaving(false);
      alert("Erro ao apagar blocos antigos: " + deleteError.message);
      return;
    }

    const rows = normalizeSortOrder(blocks).map((block) => ({
      exam_id: provaSelecionada.id,
      block_type: block.block_type,
      sort_order: block.sort_order,
      title: block.title || null,
      content: block.content || null,
      question_number: block.question_number || null,
      question_type: block.question_type || null,
      option_a: block.option_a || null,
      option_b: block.option_b || null,
      option_c: block.option_c || null,
      option_d: block.option_d || null,
      option_e: block.option_e || null,
      correct_answer: block.correct_answer || "",
      points: block.points || 1,
      is_active: true,
    }));

    const { error: insertError } = await supabase.from("exam_blocks").insert(rows);

    setSaving(false);

    if (insertError) {
      alert("Erro ao salvar blocos: " + insertError.message);
      return;
    }

    alert("Blocos salvos com sucesso!");
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>📚 Gerenciar Provas</h1>
          <p style={styles.subtitle}>
            Coleções → Livros → Pastas → Slots → Provas → Importar PDF ou Imagem
          </p>
        </div>

        <button onClick={carregarColecoes} style={styles.refreshButton}>
          🔄 Atualizar
        </button>
      </div>

      {carregando && <div style={styles.notice}>Carregando...</div>}

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Coleções</h2>

          {colecoes.length === 0 && (
            <p style={styles.empty}>Nenhuma coleção encontrada.</p>
          )}

          {colecoes.map((c) => (
            <button
              key={c.id}
              style={itemStyle(colecaoSelecionada?.id === c.id)}
              onClick={() => abrirColecao(c)}
            >
              📚 {c.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Livros</h2>

          {!colecaoSelecionada && (
            <p style={styles.empty}>Selecione uma coleção.</p>
          )}

          {colecaoSelecionada && livros.length === 0 && (
            <p style={styles.empty}>Nenhum livro encontrado.</p>
          )}

          {livros.map((l) => (
            <button
              key={l.id}
              style={itemStyle(livroSelecionado?.id === l.id)}
              onClick={() => abrirLivro(l)}
            >
              📘 {l.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Pastas</h2>

          {!livroSelecionado && <p style={styles.empty}>Selecione um livro.</p>}

          {livroSelecionado && pastas.length === 0 && (
            <p style={styles.empty}>Nenhuma pasta encontrada.</p>
          )}

          {pastas.map((p) => (
            <button
              key={p.id}
              style={itemStyle(pastaSelecionada?.id === p.id)}
              onClick={() => abrirPasta(p)}
            >
              📁 {p.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Slots</h2>

            {pastaSelecionada && (
              <button onClick={adicionarSlot} style={styles.smallAddButton}>
                ➕ Slot
              </button>
            )}
          </div>

          {!pastaSelecionada && (
            <p style={styles.empty}>Selecione uma pasta.</p>
          )}

          {pastaSelecionada && (
            <div style={styles.selectedBox}>
              Pasta selecionada: <strong>{pastaSelecionada.name}</strong>
            </div>
          )}

          {pastaSelecionada && slots.length === 0 && (
            <div style={styles.emptyActionBox}>
              <p style={styles.empty}>Nenhum slot cadastrado nesta pasta.</p>
              <button onClick={adicionarSlot} style={styles.addButtonFull}>
                ➕ Adicionar primeiro slot
              </button>
            </div>
          )}

          {slots.map((s) => (
            <div key={s.id} style={styles.slotRow}>
              <button
                style={itemStyle(slotSelecionado?.id === s.id)}
                onClick={() => abrirSlot(s)}
              >
                🧩 {s.name}
              </button>

              <div style={styles.slotActions}>
                <button
                  onClick={() => renomearSlot(s)}
                  style={styles.iconButton}
                  title="Renomear slot"
                >
                  ✏️
                </button>

                <button
                  onClick={() => excluirSlot(s)}
                  style={styles.iconDeleteButton}
                  title="Excluir slot"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>

      {slotSelecionado && (
        <section style={styles.provasCard}>
          <h2 style={styles.cardTitle}>📄 Provas em: {slotSelecionado.name}</h2>
          <p style={styles.subtitle}>Pasta: {pastaSelecionada?.name || "Não informada"}</p>

          <input
            placeholder="Nome da prova"
            value={novaProva}
            onChange={(e) => setNovaProva(e.target.value)}
            style={styles.input}
          />

          <textarea
            placeholder="Descrição da prova"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            style={styles.textarea}
          />

          <button onClick={adicionarProva} style={styles.addButton}>
            ➕ Adicionar Prova
          </button>

          <div style={styles.listaProvas}>
            {provas.length === 0 && (
              <p style={styles.empty}>Nenhuma prova cadastrada neste slot.</p>
            )}

            {provas.map((p) => (
              <div key={p.id} style={styles.provaItem}>
                <div style={styles.provaInfo}>
                  <strong>{p.title}</strong>
                  {p.description && <p>{p.description}</p>}
                  <small>ID: {p.id}</small>
                </div>

                <div style={styles.provaActions}>
                  <button
                    onClick={() => {
                      window.location.href = `/admin/exams/${p.id}`;
                    }}
                    style={styles.openButton}
                  >
                    📝 Questões
                  </button>

                  <button onClick={() => selecionarProvaParaImportar(p)} style={styles.importButton}>
                    📥 Importar PDF/Imagem
                  </button>

                  <button
                    onClick={() => {
                      alert("Função futura: usar IA para melhorar OCR e organizar blocos automaticamente.");
                    }}
                    style={styles.aiButton}
                  >
                    🧠 IA Futuro
                  </button>

                  <button onClick={() => copiarLink(p)} style={styles.copyButton}>
                    🔗 Copiar Link
                  </button>

                  <button onClick={() => enviarWhatsApp(p)} style={styles.whatsButton}>
                    🟢 WhatsApp
                  </button>

                  <button onClick={() => enviarEmail(p)} style={styles.emailButton}>
                    ✉️ Email
                  </button>

                  <button onClick={() => abrirAluno(p)} style={styles.studentButton}>
                    👨‍🎓 Ver Aluno
                  </button>

                  <button onClick={() => renomearProva(p)} style={styles.editButton}>
                    ✏️ Editar
                  </button>

                  <button onClick={() => excluirProva(p.id)} style={styles.deleteButton}>
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {showImporter && provaSelecionada && (
        <section id="importador-integrado" style={styles.importerCard}>
          <div style={styles.importerHeader}>
            <div>
              <h2 style={styles.cardTitle}>📥 Importador PDF/Imagem da prova selecionada</h2>
              <p style={styles.subtitle}>
                Prova: <strong>{provaSelecionada.title}</strong>
              </p>
              <p style={styles.subtitle}>Exam ID: {provaSelecionada.id}</p>
            </div>

            <button
              onClick={() => {
                setShowImporter(false);
                resetImporter();
              }}
              style={styles.closeButton}
            >
              Fechar Importador
            </button>
          </div>

          <label style={styles.label}>Modo do parser</label>
          <select
            value={parserMode}
            onChange={(e) => setParserMode(e.target.value as ParserMode)}
            style={styles.input}
          >
            <option value="sbs">SBS inteligente</option>
            <option value="generic">Genérico</option>
          </select>

          <label style={styles.label}>Modo do OCR</label>
          <select
            value={ocrMode}
            onChange={(e) => setOcrMode(e.target.value as OcrMode)}
            style={styles.input}
          >
            <option value="columns">Por colunas - melhor para SBS</option>
            <option value="full">Página inteira</option>
          </select>

          <div style={styles.uploadBox}>
            <h3>📷 Opção A — Imagem da prova com OCR</h3>
            <p>Use JPG, PNG ou WEBP. Para páginas escaneadas ou prints, esta opção costuma misturar menos as questões que PDF.</p>

            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) extractTextFromImage(file);
              }}
              style={styles.input}
              disabled={ocrRunning}
            />

            {ocrStatus && <div style={styles.statusBox}>{ocrStatus}</div>}
          </div>

          <div style={styles.uploadBox}>
            <h3>Opção B — PDF escaneado com OCR</h3>
            <p>Use esta opção quando você tiver apenas o PDF. Para PDFs de duas colunas, teste o modo por colunas.</p>

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) extractTextFromPdfWithOcr(file);
              }}
              style={styles.input}
              disabled={ocrRunning}
            />
          </div>

          <div style={styles.teacherBox}>
            <h3>📘 Espelho / Teacher PDF — Gabarito oficial</h3>
            <p>
              Use esta opção para importar o PDF do professor. O sistema lê o padrão
              <strong> ANS:</strong> e grava as respostas em <strong>correct_answer</strong>.
            </p>

            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) extractTextFromTeacherPdf(file);
              }}
              style={styles.input}
            />

            {answerKeyStatus && <div style={styles.answerKeyStatusBox}>{answerKeyStatus}</div>}
          </div>

          <div style={styles.uploadBox}>
            <h3>Opção C — Colar texto extraído manualmente</h3>
            <p>Use esta opção quando você conseguir copiar texto do PDF.</p>

            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              style={styles.largeTextarea}
              placeholder="Cole aqui o texto do PDF..."
            />
          </div>

          <div style={styles.importButtons}>
            <button onClick={generateBlocks} style={styles.generateButton} disabled={ocrRunning}>
              ⚙️ Gerar Blocos
            </button>

            <button onClick={addInstructionBlock} style={styles.secondaryButton}>
              ➕ Instrução
            </button>

            <button onClick={addExampleBlock} style={styles.secondaryButton}>
              ➕ Exemplo
            </button>

            <button onClick={addWordBankBlock} style={styles.secondaryButton}>
              ➕ Word Bank
            </button>

            <button onClick={addQuestionBlock} style={styles.secondaryButton}>
              ➕ Questão
            </button>

            <button onClick={renumberQuestions} style={styles.secondaryButton}>
              🔢 Renumerar
            </button>

            <button onClick={saveBlocks} disabled={saving} style={styles.saveButton}>
              {saving ? "Salvando..." : "💾 Salvar em exam_blocks"}
            </button>
          </div>

          {blocks.length > 0 && (
            <div style={styles.previewCard}>
              <h2>Prévia dos Blocos ({blocks.length})</h2>

              {blocks.map((block, index) => (
                <div key={index} style={styles.blockCard}>
                  <div style={styles.blockHeader}>
                    <strong>
                      #{index + 1} — {block.block_type}
                      {block.block_type === "question" && block.question_number
                        ? ` — Question ${block.question_number}`
                        : ""}
                    </strong>

                    <div>
                      <button onClick={() => moveBlock(index, "up")} style={styles.smallBlueButton}>
                        ↑
                      </button>
                      <button onClick={() => moveBlock(index, "down")} style={styles.smallBlueButton}>
                        ↓
                      </button>
                      <button onClick={() => deleteBlock(index)} style={styles.smallRedButton}>
                        Remover
                      </button>
                    </div>
                  </div>

                  <label style={styles.smallLabel}>Tipo do bloco</label>
                  <select
                    value={block.block_type}
                    onChange={(e) => updateBlock(index, "block_type", e.target.value)}
                    style={styles.input}
                  >
                    <option value="header">header</option>
                    <option value="instruction">instruction</option>
                    <option value="example">example</option>
                    <option value="word_bank">word_bank</option>
                    <option value="question">question</option>
                  </select>

                  <label style={styles.smallLabel}>Título</label>
                  <input
                    value={block.title || ""}
                    onChange={(e) => updateBlock(index, "title", e.target.value)}
                    style={styles.input}
                  />

                  <label style={styles.smallLabel}>Conteúdo / Pergunta</label>
                  <textarea
                    value={block.content || ""}
                    onChange={(e) => updateBlock(index, "content", e.target.value)}
                    style={styles.smallTextarea}
                  />

                  {block.block_type === "question" && (
                    <>
                      <div style={styles.twoCols}>
                        <div>
                          <label style={styles.smallLabel}>Nº</label>
                          <input
                            type="number"
                            value={block.question_number || ""}
                            onChange={(e) =>
                              updateBlock(index, "question_number", Number(e.target.value))
                            }
                            style={styles.input}
                          />
                        </div>

                        <div>
                          <label style={styles.smallLabel}>Tipo de questão</label>
                          <select
                            value={block.question_type || "multiple_choice"}
                            onChange={(e) => updateBlock(index, "question_type", e.target.value)}
                            style={styles.input}
                          >
                            <option value="multiple_choice">multiple_choice</option>
                            <option value="fill_blank">fill_blank</option>
                          </select>
                        </div>
                      </div>

                      {block.question_type === "multiple_choice" && (
                        <div style={styles.optionsGrid}>
                          <input
                            placeholder="A"
                            value={block.option_a || ""}
                            onChange={(e) => updateBlock(index, "option_a", e.target.value)}
                            style={styles.input}
                          />
                          <input
                            placeholder="B"
                            value={block.option_b || ""}
                            onChange={(e) => updateBlock(index, "option_b", e.target.value)}
                            style={styles.input}
                          />
                          <input
                            placeholder="C"
                            value={block.option_c || ""}
                            onChange={(e) => updateBlock(index, "option_c", e.target.value)}
                            style={styles.input}
                          />
                          <input
                            placeholder="D"
                            value={block.option_d || ""}
                            onChange={(e) => updateBlock(index, "option_d", e.target.value)}
                            style={styles.input}
                          />
                          <input
                            placeholder="E"
                            value={block.option_e || ""}
                            onChange={(e) => updateBlock(index, "option_e", e.target.value)}
                            style={styles.input}
                          />
                        </div>
                      )}

                      <label style={styles.smallLabel}>Resposta correta</label>
                      <input
                        value={block.correct_answer || ""}
                        onChange={(e) => updateBlock(index, "correct_answer", e.target.value)}
                        style={styles.input}
                        placeholder="Ex: a, b, c, d, to quit..."
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

const styles: any = {
  page: {
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "18px",
  },

  title: {
    margin: 0,
    color: "#111827",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  notice: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(230px, 1fr))",
    gap: "16px",
    alignItems: "start",
  },

  card: {
    background: "#fff",
    padding: "18px",
    borderRadius: "14px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    minHeight: "230px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },

  cardTitle: {
    margin: "0 0 12px",
    color: "#111827",
    fontSize: "20px",
  },

  item: {
    display: "block",
    width: "100%",
    marginBottom: "8px",
    padding: "11px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    background: "#f9fafb",
    cursor: "pointer",
    textAlign: "left",
    color: "#111827",
  },

  itemActive: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
    fontWeight: "bold",
  },

  empty: {
    color: "#64748b",
    fontSize: "14px",
  },

  selectedBox: {
    background: "#f1f5f9",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "10px",
    color: "#334155",
    fontSize: "14px",
  },

  emptyActionBox: {
    border: "1px dashed #cbd5e1",
    borderRadius: "10px",
    padding: "14px",
    background: "#f8fafc",
  },

  refreshButton: {
    padding: "11px 14px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  smallAddButton: {
    padding: "8px 10px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  addButtonFull: {
    width: "100%",
    padding: "11px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  slotRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px",
    alignItems: "start",
  },

  slotActions: {
    display: "flex",
    gap: "5px",
    paddingTop: "1px",
  },

  iconButton: {
    padding: "9px",
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  iconDeleteButton: {
    padding: "9px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  provasCard: {
    marginTop: "24px",
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },

  textarea: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    minHeight: "80px",
  },

  largeTextarea: {
    width: "100%",
    minHeight: "260px",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    marginBottom: "14px",
  },

  smallTextarea: {
    width: "100%",
    minHeight: "80px",
    padding: "12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
  },

  addButton: {
    padding: "12px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  listaProvas: {
    marginTop: "18px",
  },

  provaItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    marginBottom: "10px",
    background: "#f9fafb",
  },

  provaInfo: {
    minWidth: 0,
  },

  provaActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "flex-end",
  },

  openButton: {
    padding: "8px 10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  importButton: {
    padding: "8px 10px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  aiButton: {
    padding: "8px 10px",
    background: "#9333ea",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  copyButton: {
    padding: "8px 10px",
    background: "#0284c7",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  whatsButton: {
    padding: "8px 10px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  emailButton: {
    padding: "8px 10px",
    background: "#475569",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  studentButton: {
    padding: "8px 10px",
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  editButton: {
    padding: "8px 10px",
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  deleteButton: {
    padding: "8px 10px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  importerCard: {
    marginTop: "24px",
    background: "#fff",
    padding: "22px",
    borderRadius: "14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },

  importerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "14px",
    marginBottom: "16px",
  },

  closeButton: {
    padding: "10px 12px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  label: {
    display: "block",
    fontWeight: "bold",
    marginBottom: "8px",
  },

  smallLabel: {
    display: "block",
    fontWeight: "bold",
    fontSize: "13px",
    marginBottom: "6px",
    marginTop: "10px",
  },

  uploadBox: {
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "18px",
  },

  teacherBox: {
    border: "1px solid #bbf7d0",
    background: "#f0fdf4",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "18px",
  },

  answerKeyStatusBox: {
    marginTop: "10px",
    background: "#dcfce7",
    color: "#166534",
    border: "1px solid #86efac",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "bold",
  },

  statusBox: {
    marginTop: "10px",
    background: "#eff6ff",
    color: "#1d4ed8",
    border: "1px solid #bfdbfe",
    padding: "12px",
    borderRadius: "10px",
    fontWeight: "bold",
  },

  importButtons: {
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginBottom: "18px",
  },

  generateButton: {
    padding: "12px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  secondaryButton: {
    padding: "12px 16px",
    background: "#64748b",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  saveButton: {
    padding: "12px 16px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  previewCard: {
    background: "#fff",
    padding: "22px",
    borderRadius: "14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },

  blockCard: {
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
    background: "#f9fafb",
  },

  blockHeader: {
    marginBottom: "10px",
    color: "#111827",
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    alignItems: "center",
  },

  smallBlueButton: {
    padding: "6px 8px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginLeft: "4px",
  },

  smallRedButton: {
    padding: "6px 8px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginLeft: "4px",
  },

  twoCols: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: "12px",
  },

  optionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "10px",
  },
};

"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

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

type ParserMode = "sbs" | "generic";
type OcrMode = "columns" | "full";

type ExtractedOptions = {
  questionText: string;
  a?: string | null;
  b?: string | null;
  c?: string | null;
  d?: string | null;
  e?: string | null;
};

export default function ImportPdfPage() {
  const [examId, setExamId] = useState("");
  const [rawText, setRawText] = useState("");
  const [blocks, setBlocks] = useState<ExamBlockDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrStatus, setOcrStatus] = useState("");
  const [parserMode, setParserMode] = useState<ParserMode>("sbs");
  const [ocrMode, setOcrMode] = useState<OcrMode>("columns");

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
    return /^[a-e][\).]\s+/.test(line);
  }

  function parseOption(line: string) {
    const letter = line.charAt(0).toLowerCase();
    const text = cleanLine(line.slice(2));
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

          setOcrStatus(`OCR página ${pageNumber}/${pdf.numPages} coluna esquerda...`);
          const leftText = await recognizeCanvas(
            leftCanvas,
            `OCR página ${pageNumber}/${pdf.numPages} esquerda`
          );

          setOcrStatus(`OCR página ${pageNumber}/${pdf.numPages} coluna direita...`);
          const rightText = await recognizeCanvas(
            rightCanvas,
            `OCR página ${pageNumber}/${pdf.numPages} direita`
          );

          fullText += `\n\n--- PAGE ${pageNumber} LEFT ---\n\n${leftText}`;
          fullText += `\n\n--- PAGE ${pageNumber} RIGHT ---\n\n${rightText}`;
        } else {
          setOcrStatus(`OCR página ${pageNumber}/${pdf.numPages} inteira...`);

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
      const lower = line.toLowerCase();

      if (looksLikeHeader(line) && !headerCreated) {
        flushAll();
        generated.push(makeHeaderBlock(cleanHeaderTitle(line), sort++));
        headerCreated = true;
        continue;
      }

      if (isSbsSection(line)) {
        flushAll();

        section = cleanSectionTitle(line);

        generated.push(
          makeInstructionBlock(section, getSectionDescription(section), sort++)
        );
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

    const improved = postProcessSbsBlocks(generated);

    setBlocks(normalizeSortOrder(improved));
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

    const markers: Array<{ letter: string; index: number; length: number }> = [];
    const regex = /(?:^|\s)([a-e])[\).]\s+/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(normalized)) !== null) {
      const markerText = match[0];
      const letter = match[1].toLowerCase();
      const index = match.index + markerText.search(/[a-e]/i);
      markers.push({
        letter,
        index,
        length: markerText.length - markerText.search(/[a-e]/i),
      });
    }

    const required = ["a", "b", "c", "d"];
    const hasRequired = required.every((letter) =>
      markers.some((marker) => marker.letter === letter)
    );

    if (!hasRequired) return null;

    const firstA = markers.find((marker) => marker.letter === "a");
    if (!firstA || firstA.index < 8) return null;

    const questionText = cleanLine(normalized.slice(0, firstA.index));

    const result: ExtractedOptions = {
      questionText,
      a: null,
      b: null,
      c: null,
      d: null,
      e: null,
    };

    markers.forEach((marker, position) => {
      const start = marker.index + marker.length;
      const end =
        position + 1 < markers.length ? markers[position + 1].index : normalized.length;

      const optionText = cleanLine(normalized.slice(start, end));

      if (marker.letter === "a") result.a = optionText;
      if (marker.letter === "b") result.b = optionText;
      if (marker.letter === "c") result.c = optionText;
      if (marker.letter === "d") result.d = optionText;
      if (marker.letter === "e") result.e = optionText;
    });

    return result;
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
    if (!examId.trim()) {
      alert("Informe o Exam ID.");
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
      .eq("exam_id", examId.trim());

    if (deleteError) {
      setSaving(false);
      alert("Erro ao apagar blocos antigos: " + deleteError.message);
      return;
    }

    const rows = normalizeSortOrder(blocks).map((block) => ({
      exam_id: examId.trim(),
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
      <h1>📥 Importador PDF → exam_blocks</h1>

      <div style={styles.card}>
        <label style={styles.label}>Exam ID</label>
        <input
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          style={styles.input}
          placeholder="Cole aqui o ID da prova"
        />

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
          <h2>Opção A — PDF escaneado com OCR</h2>
          <p>
            Use esta opção quando o PDF for imagem/scan e você não conseguir
            copiar o texto.
          </p>

          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) extractTextFromPdfWithOcr(file);
            }}
            style={styles.input}
          />

          {ocrStatus && <div style={styles.statusBox}>{ocrStatus}</div>}
        </div>

        <div style={styles.uploadBox}>
          <h2>Opção B — Colar texto extraído manualmente</h2>
          <p>
            Use esta opção quando você conseguir copiar texto do PDF ou de outro
            lugar.
          </p>

          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            style={styles.textarea}
            placeholder="Cole aqui o texto do PDF..."
          />
        </div>

        <button
          onClick={generateBlocks}
          style={styles.generateButton}
          disabled={ocrRunning}
        >
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
                  <button onClick={() => moveBlock(index, "up")} style={styles.smallButton}>
                    ↑
                  </button>
                  <button onClick={() => moveBlock(index, "down")} style={styles.smallButton}>
                    ↓
                  </button>
                  <button onClick={() => deleteBlock(index)} style={styles.smallDeleteButton}>
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
                        onChange={(e) =>
                          updateBlock(index, "question_type", e.target.value)
                        }
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
                    onChange={(e) =>
                      updateBlock(index, "correct_answer", e.target.value)
                    }
                    style={styles.input}
                    placeholder="Ex: a, b, c, d, to quit..."
                  />
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "30px",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    background: "#fff",
    padding: "22px",
    borderRadius: "14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
    marginBottom: "24px",
  },

  previewCard: {
    background: "#fff",
    padding: "22px",
    borderRadius: "14px",
    boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
  },

  uploadBox: {
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    padding: "16px",
    borderRadius: "12px",
    marginBottom: "18px",
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

  input: {
    width: "100%",
    padding: "11px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    marginBottom: "10px",
  },

  textarea: {
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

  generateButton: {
    padding: "12px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginRight: "10px",
    marginBottom: "10px",
    fontWeight: "bold",
  },

  secondaryButton: {
    padding: "12px 16px",
    background: "#64748b",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginRight: "10px",
    marginBottom: "10px",
    fontWeight: "bold",
  },

  saveButton: {
    padding: "12px 16px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    marginBottom: "10px",
    fontWeight: "bold",
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

  smallButton: {
    padding: "6px 8px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    marginLeft: "4px",
  },

  smallDeleteButton: {
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

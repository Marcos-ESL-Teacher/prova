import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: "OPENAI_API_KEY não encontrada." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const rawText = String(body?.rawText || "").trim();
    const parserMode = String(body?.parserMode || "generic");
    const examTitle = String(body?.examTitle || "").trim();

    if (!rawText) {
      return NextResponse.json(
        { ok: false, message: "Texto da prova vazio." },
        { status: 400 }
      );
    }

    const prompt = `
You are organizing copied/OCR text from an English exam for import into a digital exam system.

Return ONLY clean plain text. Do not return JSON. Do not add explanations.

Goal:
- Preserve the exam content.
- Clean broken OCR lines.
- Separate each question clearly.
- Make the text easy for a simple parser to import.

Important formatting rules:
1. Every question must start on its own line with a number and a period, like:
1. Question text here
2. Question text here

2. If the original exam has a situation with sub-items a, b, c, convert each sub-item into its own numbered question.
Example original:
1) Bob's store went out of business.
a. He ______ (should / give up)
b. He ______ (could / ask)

Example output:
1. Bob's store went out of business. He ______ (should / give up)
2. Bob's store went out of business. He ______ (could / ask)

3. For fill-in-the-blank questions, keep the blank and the words in parentheses.
Example:
He ______ (should / give up)

4. For multiple-choice questions only, keep options on separate lines using this exact format:
A. option
B. option
C. option
D. option
E. option

5. Do not use A/B/C/D as options for subquestions unless they are real multiple-choice alternatives.

6. Keep instructions as separate lines before the relevant questions.

7. Remove page numbers, duplicated isolated numbers, headers, footers, and scanning artifacts.

8. Do not answer the questions. Do not provide a key. Do not invent missing content.

9. If the text includes conversations, keep speaker labels A: and B: inside the question.

10. Keep all grammar prompts exactly, especially perfect modals, verbs in parentheses, and negative/affirmative instructions.

Exam title: ${examTitle || "Not provided"}
Parser mode: ${parserMode}

Raw text:
${rawText}
`.trim();

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, message: "Erro da OpenAI.", error: data },
        { status: response.status }
      );
    }

    const cleanedText = String(data?.output_text || "").trim();

    if (!cleanedText) {
      return NextResponse.json(
        { ok: false, message: "A IA não retornou texto corrigido." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      cleanedText,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error?.message || "Erro inesperado." },
      { status: 500 }
    );
  }
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

const BOOKS = [
  "SBS Book 1 Plus",
  "SBS Book 2 Plus",
  "SBS Book 3 Plus",
  "SBS Book 4 Plus",
];

const CHAPTERS_BY_BOOK: Record<string, string[]> = {
  "SBS Book 1 Plus": Array.from({ length: 17 }, (_, i) => `Chapter ${i + 1}`),
  "SBS Book 2 Plus": Array.from({ length: 13 }, (_, i) => `Chapter ${i + 1}`),
  "SBS Book 3 Plus": Array.from({ length: 10 }, (_, i) => `Chapter ${i + 1}`),
  "SBS Book 4 Plus": Array.from({ length: 10 }, (_, i) => `Chapter ${i + 1}`),
};

function gerarNomeDaProva(
  nomeAluno: string,
  livro: string,
  unitFolder: string,
  subfolderName: string
) {
  const agora = new Date();
  const data = agora.toLocaleDateString("pt-BR");
  const hora = agora.toLocaleTimeString("pt-BR");
  return `${nomeAluno || "Sem nome"} - ${livro} - ${unitFolder} - ${subfolderName} - ${data} ${hora}`;
}

export default function Home() {
  const searchParams = useSearchParams();

  const bookParam = searchParams.get("book");
  const modeParam = searchParams.get("mode");
  const chapterParam = searchParams.get("chapter");
  const subParam = searchParams.get("sub");

  const [nome, setNome] = useState("");

  const [book, setBook] = useState(bookParam || "SBS Book 1 Plus");

  const [mode, setMode] = useState<"chapter" | "hometest">(
    modeParam === "hometest" ? "hometest" : "chapter"
  );

  const [chapter, setChapter] = useState(chapterParam || "Chapter 1");

  const [chapterSubfolder, setChapterSubfolder] = useState<
    "Provas" | "Exercícios Extras"
  >(
    subParam === "Exercícios Extras" ? "Exercícios Extras" : "Provas"
  );

  const [homeTestSubfolder, setHomeTestSubfolder] = useState<
    "HomeTest-Mid" | "HomeTest-Final"
  >(
    subParam === "HomeTest-Final" ? "HomeTest-Final" : "HomeTest-Mid"
  );

  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [avisos, setAvisos] = useState(0);

  const chapters = useMemo(() => {
    return CHAPTERS_BY_BOOK[book] || [];
  }, [book]);

  useEffect(() => {
    if (!chapters.includes(chapter)) {
      setChapter(chapters[0] || "");
    }
  }, [book, chapters, chapter]);

  useEffect(() => {
    function detectarTrocaAba() {
      if (document.hidden) {
        setAvisos((prev) => prev + 1);

        alert("⚠️ Você saiu da aba! Isso será registrado.");

        supabase.from("exam_logs").insert([
          {
            student_name: nome || "Sem nome",
            evento: "troca_aba",
          },
        ]);
      }
    }

    document.addEventListener("visibilitychange", detectarTrocaAba);

    return () => {
      document.removeEventListener("visibilitychange", detectarTrocaAba);
    };
  }, [nome]);

  async function enviar() {
    const unitFolder = mode === "chapter" ? chapter : "HomeTest";
    const subfolderName =
      mode === "chapter" ? chapterSubfolder : homeTestSubfolder;

    const examName = gerarNomeDaProva(nome, book, unitFolder, subfolderName);

    const { error } = await supabase.from("exam_submissions").insert([
      {
        student_name: nome,
        book_name: book,
        unit_folder: unitFolder,
        subfolder_name: subfolderName,
        exam_name: examName,
        answers: {
          pergunta1: q1,
          pergunta2: q2,
        },
      },
    ]);

    if (error) {
      alert("❌ ERRO: " + error.message);
      return;
    }

    alert(`✅ Enviado com sucesso!\n${examName}`);

    setQ1("");
    setQ2("");
  }

  const usingFixedLink = !!bookParam || !!modeParam || !!chapterParam || !!subParam;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #3b82f6, #9333ea)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 30,
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          fontFamily: "Arial, sans-serif",
        }}
      >
        <h1 style={{ textAlign: "center", marginBottom: 20 }}>
          📘 Prova Online
        </h1>

        <p style={{ color: "red", textAlign: "center" }}>
          ⚠️ Trocas de aba: {avisos}
        </p>

        <input
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={inputStyle}
        />

        {!usingFixedLink && (
          <>
            <label style={labelStyle}>Livro</label>
            <select
              value={book}
              onChange={(e) => setBook(e.target.value)}
              style={inputStyle}
            >
              {BOOKS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            <label style={labelStyle}>Tipo de pasta</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as "chapter" | "hometest")}
              style={inputStyle}
            >
              <option value="chapter">Chapter</option>
              <option value="hometest">HomeTest</option>
            </select>

            {mode === "chapter" ? (
              <>
                <label style={labelStyle}>Chapter</label>
                <select
                  value={chapter}
                  onChange={(e) => setChapter(e.target.value)}
                  style={inputStyle}
                >
                  {chapters.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <label style={labelStyle}>Subpasta</label>
                <select
                  value={chapterSubfolder}
                  onChange={(e) =>
                    setChapterSubfolder(
                      e.target.value as "Provas" | "Exercícios Extras"
                    )
                  }
                  style={inputStyle}
                >
                  <option value="Provas">Provas</option>
                  <option value="Exercícios Extras">Exercícios Extras</option>
                </select>
              </>
            ) : (
              <>
                <label style={labelStyle}>Subpasta HomeTest</label>
                <select
                  value={homeTestSubfolder}
                  onChange={(e) =>
                    setHomeTestSubfolder(
                      e.target.value as "HomeTest-Mid" | "HomeTest-Final"
                    )
                  }
                  style={inputStyle}
                >
                  <option value="HomeTest-Mid">HomeTest-Mid</option>
                  <option value="HomeTest-Final">HomeTest-Final</option>
                </select>
              </>
            )}
          </>
        )}

        {usingFixedLink && (
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e5e7eb",
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <p style={{ margin: "4px 0" }}>
              <strong>Livro:</strong> {book}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Pasta:</strong> {mode === "chapter" ? chapter : "HomeTest"}
            </p>
            <p style={{ margin: "4px 0" }}>
              <strong>Tipo:</strong>{" "}
              {mode === "chapter" ? chapterSubfolder : homeTestSubfolder}
            </p>
          </div>
        )}

        <label style={labelStyle}>Pergunta 1</label>
        <p>Capital do Brasil?</p>
        <input
          value={q1}
          onChange={(e) => setQ1(e.target.value)}
          style={inputStyle}
        />

        <label style={labelStyle}>Pergunta 2</label>
        <p>Quanto é 2 + 2?</p>
        <input
          value={q2}
          onChange={(e) => setQ2(e.target.value)}
          style={inputStyle}
        />

        <button onClick={enviar} style={buttonStyle}>
          🚀 Enviar Prova
        </button>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontWeight: 700,
  marginBottom: 6,
  color: "#111827",
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  padding: 14,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 16,
};
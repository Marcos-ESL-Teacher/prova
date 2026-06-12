"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function ProvaClient() {
  const params = useSearchParams();

  const book = params.get("book") || "SBS Book 1 Plus";
  const mode = params.get("mode") || "chapter";
  const chapter = params.get("chapter") || "Chapter 1";
  const sub = params.get("sub") || "Provas";

  const [nome, setNome] = useState("");
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [avisos, setAvisos] = useState(0);

  const unidade = mode === "chapter" ? chapter : "HomeTest";

  useEffect(() => {
    function detectarTrocaAba() {
      if (document.hidden) {
        setAvisos((prev) => prev + 1);

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
    const agora = new Date();

    const exam_name = `${nome} - ${book} - ${unidade} - ${sub} - ${agora.toLocaleString(
      "pt-BR"
    )}`;

    const { error } = await supabase.from("exam_submissions").insert([
      {
        student_name: nome,
        book_name: book,
        unit_folder: unidade,
        subfolder_name: sub,
        exam_name,
        answers: {
          pergunta1: q1,
          pergunta2: q2,
        },
      },
    ]);

    if (error) {
      alert("Erro: " + error.message);
      return;
    }

    alert("✅ Prova enviada!");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#0f172a",
        color: "#fff",
      }}
    >
      <div
        style={{
          background: "#fff",
          color: "#000",
          padding: 24,
          borderRadius: 12,
          width: "100%",
          maxWidth: 500,
        }}
      >
        <h1>📘 Prova</h1>

        <p>⚠️ Trocas de aba: {avisos}</p>

        <div style={{ background: "#eee", padding: 10 }}>
          <p><b>Livro:</b> {book}</p>
          <p><b>Chapter:</b> {unidade}</p>
          <p><b>Tipo:</b> {sub}</p>
        </div>

        <input
          placeholder="Seu nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />

        <p>Pergunta 1</p>
        <input value={q1} onChange={(e) => setQ1(e.target.value)} />

        <p>Pergunta 2</p>
        <input value={q2} onChange={(e) => setQ2(e.target.value)} />

        <br /><br />
        <button onClick={enviar}>Enviar</button>
      </div>
    </div>
  );
}
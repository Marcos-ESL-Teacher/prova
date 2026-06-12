"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

export default function Home() {
  const [nome, setNome] = useState("");
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [avisos, setAvisos] = useState(0);

  useEffect(() => {
    function trocarAba() {
      if (document.hidden) {
        setAvisos((prev) => prev + 1);
        alert("⚠️ Saiu da aba!");

        supabase.from("exam_logs").insert([
          {
            student_name: nome || "Sem nome",
            evento: "troca_aba",
          },
        ]);
      }
    }

    document.addEventListener("visibilitychange", trocarAba);
    return () =>
      document.removeEventListener("visibilitychange", trocarAba);
  }, [nome]);

  async function enviar() {
    const { error } = await supabase.from("exam_submissions").insert([
      {
        student_name: nome,
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

    alert("✅ Enviado com sucesso!");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #3b82f6, #9333ea)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 30,
          borderRadius: 16,
          width: "100%",
          maxWidth: 500,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          fontFamily: "Arial",
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

        <label>Pergunta 1</label>
        <p>Capital do Brasil?</p>
        <input
          value={q1}
          onChange={(e) => setQ1(e.target.value)}
          style={inputStyle}
        />

        <label>Pergunta 2</label>
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

// 🎨 estilos
const inputStyle = {
  width: "100%",
  padding: 12,
  marginBottom: 12,
  borderRadius: 8,
  border: "1px solid #ccc",
  fontSize: 14,
};

const buttonStyle = {
  width: "100%",
  padding: 14,
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  cursor: "pointer",
  fontSize: 16,
};
``
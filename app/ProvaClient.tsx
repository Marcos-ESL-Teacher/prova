"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function ProvaClient() {
  const [studentName, setStudentName] = useState("")
  const [q1, setQ1] = useState("")
  const [q2, setQ2] = useState("")
  const [mensagem, setMensagem] = useState("")

  async function enviarProva() {
    if (!studentName.trim()) {
      setMensagem("Digite o nome do aluno!")
      return
    }

    try {
      const { error } = await supabase
        .from("exam_submissions")
        .insert([
          {
            student_name: studentName,
            book_name: "Livro de Teste",
            unit_folder: "Unidade 1",
            subfolder_name: "Subpasta A",
            exam_name: "Prova 2 Questões",
            answers: {
              pergunta1: q1,
              pergunta2: q2
            }
          }
        ])

      if (error) {
        console.log("ERRO:", error)
        setMensagem("Erro ao enviar!")
      } else {
        setMensagem("Prova enviada com sucesso ✅")
        setStudentName("")
        setQ1("")
        setQ2("")
      }
    } catch (err) {
      console.log("FALHA:", err)
      setMensagem("Falha geral!")
    }
  }

  return (
    <div style={{ padding: "30px", maxWidth: "600px", margin: "0 auto", fontFamily: "Arial" }}>
      <h1>Prova</h1>

      <div style={{ marginBottom: "18px" }}>
        <label><strong>Nome do aluno:</strong></label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          style={{ width: "100%", padding: "10px", marginTop: "6px" }}
        />
      </div>

      <div style={{ marginBottom: "18px" }}>
        <p><strong>1) Qual é 2 + 2?</strong></p>
        <input
          type="text"
          value={q1}
          onChange={(e) => setQ1(e.target.value)}
          style={{ width: "100%", padding: "10px" }}
        />
      </div>

      <div style={{ marginBottom: "18px" }}>
        <p><strong>2) Qual é a capital do Brasil?</strong></p>
        <input
          type="text"
          value={q2}
          onChange={(e) => setQ2(e.target.value)}
          style={{ width: "100%", padding: "10px" }}
        />
      </div>

      <button
        onClick={enviarProva}
        style={{
          padding: "12px 16px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "bold"
        }}
      >
        Enviar Prova
      </button>

      <p style={{ marginTop: "14px", fontWeight: "bold" }}>{mensagem}</p>
    </div>
  )
}
"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function ProvaClient() {

  const [nome, setNome] = useState("")
  const [q1, setQ1] = useState("")
  const [q2, setQ2] = useState("")
  const [mensagem, setMensagem] = useState("")

  async function enviarProva() {
    if (!nome.trim()) {
      setMensagem("Digite seu nome!")
      return
    }

    try {
      const { error } = await supabase
        .from("exam_submissions")
        .insert([
          {
            student_name: nome,
            book_name: "Livro 1",
            unit_folder: "Unit 1",
            subfolder_name: "Test 1",
            exam_name: "Prova Simples",
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
        setMensagem("✅ Prova enviada com sucesso!")
        setNome("")
        setQ1("")
        setQ2("")
      }

    } catch (err) {
      console.log(err)
      setMensagem("Falha geral!")
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "Arial"
    }}>

      <div style={{
        background: "#fff",
        padding: "30px",
        borderRadius: "20px",
        width: "100%",
        maxWidth: "500px",
        boxShadow: "0px 10px 30px rgba(0,0,0,0.1)"
      }}>

        <h1 style={{ textAlign: "center" }}>📝 Prova</h1>

        {/* Nome */}
        <div style={{ marginTop: "20px" }}>
          <label><strong>Nome do aluno:</strong></label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={input}
          />
        </div>

        {/* Pergunta 1 */}
        <div style={boxPergunta}>
          <p>1) Qual é 2 + 2?</p>
          <input
            value={q1}
            onChange={(e) => setQ1(e.target.value)}
            style={input}
          />
        </div>

        {/* Pergunta 2 */}
        <div style={boxPergunta}>
          <p>2) Qual é a capital do Brasil?</p>
          <input
            value={q2}
            onChange={(e) => setQ2(e.target.value)}
            style={input}
          />
        </div>

        {/* Botão */}
        <button onClick={enviarProva} style={botao}>
          Enviar Prova
        </button>

        <p style={{
          marginTop: "15px",
          textAlign: "center",
          fontWeight: "bold"
        }}>
          {mensagem}
        </p>

      </div>
    </div>
  )
}

const input = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  marginTop: "5px"
}

const boxPergunta = {
  marginTop: "20px"
}

const botao = {
  marginTop: "25px",
  width: "100%",
  padding: "12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  fontSize: "16px"
}
"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function ProvaClient() {

  const [nome, setNome] = useState("")
  const [q1, setQ1] = useState("")
  const [q2, setQ2] = useState("")
  const [mensagem, setMensagem] = useState("")

  async function enviarProva() {
    if (!nome) {
      setMensagem("Digite seu nome!")
      return
    }

    try {
      const { error } = await supabase
        .from("prova")
        .insert([
          {
            resposta: `Aluno: ${nome} | Q1: ${q1} | Q2: ${q2}`
          }
        ])

      if (error) {
        console.log("ERRO:", error)
        setMensagem("Erro ao enviar!")
      } else {
        setMensagem("Prova enviada com sucesso ✅")
        setNome("")
        setQ1("")
        setQ2("")
      }

    } catch (err) {
      console.log("FALHA:", err)
      setMensagem("Falha geral!")
    }
  }

  return (
    <div style={{
      padding: "30px",
      maxWidth: "500px",
      margin: "auto",
      fontFamily: "Arial"
    }}>

      <h1 style={{ textAlign: "center" }}>Prova</h1>

      {/* Nome do aluno */}
      <div style={{ marginTop: "20px" }}>
        <label>Nome do aluno:</label>
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ width: "100%", padding: "8px", marginTop: "5px" }}
        />
      </div>

      {/* Pergunta 1 */}
      <div style={{ marginTop: "20px" }}>
        <p>1) Qual é 2 + 2?</p>
        <input
          type="text"
          value={q1}
          onChange={(e) => setQ1(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      {/* Pergunta 2 */}
      <div style={{ marginTop: "20px" }}>
        <p>2) Qual é a capital do Brasil?</p>
        <input
          type="text"
          value={q2}
          onChange={(e) => setQ2(e.target.value)}
          style={{ width: "100%", padding: "8px" }}
        />
      </div>

      {/* Botão */}
      <button
        onClick={enviarProva}
        style={{
          marginTop: "30px",
          width: "100%",
          padding: "12px",
          backgroundColor: "#0070f3",
          color: "white",
          border: "none",
          borderRadius: "5px",
          fontSize: "16px",
          cursor: "pointer"
        }}
      >
        Enviar Prova
      </button>

      {/* Mensagem */}
      <p style={{
        marginTop: "15px",
        textAlign: "center",
        fontWeight: "bold"
      }}>
        {mensagem}
      </p>

    </div>
  )
}
"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function ProvaClient() {

  const [q1, setQ1] = useState("")
  const [q2, setQ2] = useState("")
  const [mensagem, setMensagem] = useState("")

  async function enviarProva() {
    try {
      const { data, error } = await supabase
        .from("prova")
        .insert([
          {
            resposta: `Q1: ${q1} | Q2: ${q2}`
          }
        ])

      if (error) {
        console.log("ERRO:", error)
        setMensagem("Erro ao enviar!")
      } else {
        console.log("SUCESSO:", data)
        setMensagem("Prova enviada com sucesso ✅")
        setQ1("")
        setQ2("")
      }

    } catch (err) {
      console.log("FALHA:", err)
      setMensagem("Falha geral!")
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Prova</h1>

      <div>
        <p>1) Qual é 2 + 2?</p>
        <input
          type="text"
          value={q1}
          onChange={(e) => setQ1(e.target.value)}
          placeholder="Digite sua resposta"
        />
      </div>

      <div style={{ marginTop: "15px" }}>
        <p>2) Qual é a capital do Brasil?</p>
        <input
          type="text"
          value={q2}
          onChange={(e) => setQ2(e.target.value)}
          placeholder="Digite sua resposta"
        />
      </div>

      <button onClick={enviarProva} style={{ marginTop: "20px" }}>
        Enviar Prova
      </button>

      <p style={{ marginTop: "10px" }}>{mensagem}</p>
    </div>
  )
}
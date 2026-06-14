"use client"

import { useState } from "react"
import { supabase } from "../lib/supabase"

export default function ProvaClient() {

  const [senha, setSenha] = useState("")
  const [liberado, setLiberado] = useState(false)

  const [nome, setNome] = useState("")
  const [q1, setQ1] = useState("")
  const [q2, setQ2] = useState("")
  const [mensagem, setMensagem] = useState("")

  const SENHA_CORRETA = "MRL009"

  function verificarSenha() {
    if (senha === SENHA_CORRETA) {
      setLiberado(true)
      setMensagem("")
    } else {
      setMensagem("Senha incorreta ❌")
    }
  }

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

  // 🔒 TELA DE SENHA
  if (!liberado) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f3f4f6",
        fontFamily: "Arial"
      }}>
        <div style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "15px",
          width: "100%",
          maxWidth: "350px",
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ textAlign: "center" }}>🔒 Acesso à Prova</h2>

          <input
            type="password"
            placeholder="Digite a senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ width: "100%", padding: "10px", marginTop: "10px" }}
          />

          <button
            onClick={verificarSenha}
            style={{
              marginTop: "15px",
              width: "100%",
              padding: "10px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Entrar
          </button>

          <p style={{ marginTop: "10px", textAlign: "center" }}>
            {mensagem}
          </p>
        </div>
      </div>
    )
  }

  // ✅ TELA DA PROVA
  return (
    <div style={{
      padding: "30px",
      maxWidth: "500px",
      margin: "auto",
      fontFamily: "Arial"
    }}>

      <h1 style={{ textAlign: "center" }}>📝 Prova</h1>

      <div style={{ marginTop: "20px" }}>
        <label>Nome do aluno:</label>
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          style={{ width: "100%", padding: "10px" }}
        />
      </div>

      <div style={{ marginTop: "20px" }}>
        <p>1) Qual é 2 + 2?</p>
        <input
          value={q1}
          onChange={(e) => setQ1(e.target.value)}
          style={{ width: "100%", padding: "10px" }}
        />
      </div>

      <div style={{ marginTop: "20px" }}>
        <p>2) Qual é a capital do Brasil?</p>
        <input
          value={q2}
          onChange={(e) => setQ2(e.target.value)}
          style={{ width: "100%", padding: "10px" }}
        />
      </div>

      <button
        onClick={enviarProva}
        style={{
          marginTop: "20px",
          width: "100%",
          padding: "12px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: "pointer"
        }}
      >
        Enviar Prova
      </button>

      <p style={{ marginTop: "10px", textAlign: "center" }}>
        {mensagem}
      </p>

    </div>
  )
}
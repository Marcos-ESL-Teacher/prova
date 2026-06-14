"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"

export default function ProvaClient() {
  const [senha, setSenha] = useState("")
  const [liberado, setLiberado] = useState(false)
  const [nome, setNome] = useState("")
  const [q1, setQ1] = useState("")
  const [q2, setQ2] = useState("")
  const [mensagem, setMensagem] = useState("")
  const [bloqueado, setBloqueado] = useState(false)

  const studentNameRef = useRef("")

  useEffect(() => {
    studentNameRef.current = nome
  }, [nome])

  async function verificarSenha() {
    setMensagem("")

    try {
      const res = await fetch("/api/verify-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: senha })
      })

      const data = await res.json()

      if (data.ok) {
        setLiberado(true)
        setMensagem("")
      } else {
        setMensagem(data.message || "Senha incorreta ❌")
      }
    } catch {
      setMensagem("Erro ao validar senha.")
    }
  }

  async function registrarEvento(evento: string) {
    try {
      await supabase.from("exam_logs").insert([
        {
          student_name: studentNameRef.current || "Sem nome",
          evento
        }
      ])
    } catch (err) {
      console.log("Falha ao registrar log:", err)
    }
  }

  useEffect(() => {
    if (!liberado) return

    function onVisibilityChange() {
      if (document.hidden) {
        registrarEvento("Troca de aba / página ocultada")
      }
    }

    function onBlur() {
      registrarEvento("Janela perdeu foco")
    }

    function onCopy(e: ClipboardEvent) {
      e.preventDefault()
      registrarEvento("Tentativa de copiar")
    }

    function onCut(e: ClipboardEvent) {
      e.preventDefault()
      registrarEvento("Tentativa de recortar")
    }

    function onPaste(e: ClipboardEvent) {
      e.preventDefault()
      registrarEvento("Tentativa de colar")
    }

    function onContextMenu(e: MouseEvent) {
      e.preventDefault()
      registrarEvento("Tentativa de abrir menu com botão direito")
    }

    function onKeyDown(e: KeyboardEvent) {
      const tecla = e.key.toLowerCase()

      if (
        (e.ctrlKey || e.metaKey) &&
        ["c", "v", "x", "u", "s", "p"].includes(tecla)
      ) {
        e.preventDefault()
        registrarEvento(`Atalho bloqueado: ${tecla.toUpperCase()}`)
      }

      if (tecla === "f12") {
        e.preventDefault()
        registrarEvento("Tentativa de abrir DevTools com F12")
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange)
    window.addEventListener("blur", onBlur)
    document.addEventListener("copy", onCopy)
    document.addEventListener("cut", onCut)
    document.addEventListener("paste", onPaste)
    document.addEventListener("contextmenu", onContextMenu)
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange)
      window.removeEventListener("blur", onBlur)
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("cut", onCut)
      document.removeEventListener("paste", onPaste)
      document.removeEventListener("contextmenu", onContextMenu)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [liberado])

  async function enviarProva() {
    if (!nome.trim()) {
      setMensagem("Digite seu nome!")
      return
    }

    if (bloqueado) {
      setMensagem("Envio bloqueado.")
      return
    }

    try {
      const { error } = await supabase.from("exam_submissions").insert([
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
        setBloqueado(true)
      }
    } catch (err) {
      console.log("FALHA:", err)
      setMensagem("Falha geral!")
    }
  }

  if (!liberado) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
          fontFamily: "Arial"
        }}
      >
        <div
          style={{
            background: "#fff",
            padding: "30px",
            borderRadius: "18px",
            width: "100%",
            maxWidth: "380px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.12)"
          }}
        >
          <h2 style={{ textAlign: "center", marginTop: 0 }}>🔒 Acesso à Prova</h2>
          <p style={{ textAlign: "center", color: "#6b7280" }}>
            Digite a senha para iniciar a prova
          </p>

          <input
            type="password"
            placeholder="Digite a senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              marginTop: "10px"
            }}
          />

          <button
            onClick={verificarSenha}
            style={{
              marginTop: "15px",
              width: "100%",
              padding: "12px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Entrar
          </button>

          <p style={{ marginTop: "12px", textAlign: "center", fontWeight: "bold" }}>
            {mensagem}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "Arial"
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "550px",
          boxShadow: "0px 10px 30px rgba(0,0,0,0.1)"
        }}
      >
        <h1 style={{ textAlign: "center", marginTop: 0 }}>📝 Prova</h1>

        <div style={{ marginTop: "20px" }}>
          <label><strong>Nome do aluno:</strong></label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={input}
          />
        </div>

        <div style={boxPergunta}>
          <p><strong>1) Qual é 2 + 2?</strong></p>
          <input
            value={q1}
            onChange={(e) => setQ1(e.target.value)}
            style={input}
          />
        </div>

        <div style={boxPergunta}>
          <p><strong>2) Qual é a capital do Brasil?</strong></p>
          <input
            value={q2}
            onChange={(e) => setQ2(e.target.value)}
            style={input}
          />
        </div>

        <button
          onClick={enviarProva}
          disabled={bloqueado}
          style={{
            ...botao,
            opacity: bloqueado ? 0.6 : 1,
            cursor: bloqueado ? "not-allowed" : "pointer"
          }}
        >
          {bloqueado ? "Prova já enviada" : "Enviar Prova"}
        </button>

        <p
          style={{
            marginTop: "15px",
            textAlign: "center",
            fontWeight: "bold"
          }}
        >
          {mensagem}
        </p>
      </div>
    </div>
  )
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  marginTop: "6px"
}

const boxPergunta: React.CSSProperties = {
  marginTop: "20px"
}

const botao: React.CSSProperties = {
  marginTop: "25px",
  width: "100%",
  padding: "12px",
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: "8px",
  fontWeight: "bold",
  fontSize: "16px"
}
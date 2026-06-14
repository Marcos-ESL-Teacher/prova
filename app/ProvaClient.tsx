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
      const { error } = await supabase.from("exam_logs").insert([
        {
          student_name: studentNameRef.current || "Sem nome",
          evento
        }
      ])

      if (error) {
        console.log("Erro ao registrar log:", error)
      }
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

      if ((e.ctrlKey || e.metaKey) && ["c", "v", "x", "u", "s", "p"].includes(tecla)) {
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
      setMensagem("Prova já enviada.")
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
        setBloqueado(true)
      }
    } catch (err) {
      console.log("FALHA:", err)
      setMensagem("Falha geral!")
    }
  }

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

  return (
    <div style={{
      padding: "30px",
      maxWidth: "550px",
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
        disabled={bloqueado}
        style={{
          marginTop: "20px",
          width: "100%",
          padding: "12px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "5px",
          cursor: bloqueado ? "not-allowed" : "pointer",
          opacity: bloqueado ? 0.6 : 1
        }}
      >
        {bloqueado ? "Prova já enviada" : "Enviar Prova"}
      </button>

      <p style={{ marginTop: "10px", textAlign: "center" }}>
        {mensagem}
      </p>
    </div>
  )
}
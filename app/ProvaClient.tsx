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

  const [logsSuspeitos, setLogsSuspeitos] = useState(0)

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
        console.log("ERRO AO GRAVAR LOG:", error)
        return
      }

      // Atualiza a contagem local e trava ao chegar em 3
      setLogsSuspeitos((prev) => {
        const novoTotal = prev + 1

        if (novoTotal >= 3) {
          setBloqueado(true)
          setMensagem("❌ Prova bloqueada por suspeita de cola.")
        }

        return novoTotal
      })
    } catch (err) {
      console.log("FALHA AO GRAVAR LOG:", err)
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
      setMensagem("❌ Prova bloqueada por suspeita de cola.")
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
        maxWidth: "550px",
        boxShadow: "0px 10px 30px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ textAlign: "center", marginTop: 0 }}>📝 Prova</h1>

        {logsSuspeitos > 0 && (
          <div style={{
            background: logsSuspeitos >= 3 ? "#fee2e2" : "#fef3c7",
            border: logsSuspeitos >= 3 ? "1px solid #dc2626" : "1px solid #f59e0b",
            color: logsSuspeitos >= 3 ? "#991b1b" : "#92400e",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
            fontWeight: "bold"
          }}>
            {logsSuspeitos >= 3
              ? "❌ Prova bloqueada por suspeita de cola."
              : `⚠️ Evento(s) suspeito(s) detectado(s): ${logsSuspeitos}/3`}
          </div>
        )}

        <div style={{ marginTop: "20px" }}>
          <label>Nome do aluno:</label>
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            style={{ width: "100%", padding: "10px" }}
            disabled={bloqueado}
          />
        </div>

        <div style={{ marginTop: "20px" }}>
          <p>1) Qual é 2 + 2?</p>
          <input
            value={q1}
            onChange={(e) => setQ1(e.target.value)}
            style={{ width: "100%", padding: "10px" }}
            disabled={bloqueado}
          />
        </div>

        <div style={{ marginTop: "20px" }}>
          <p>2) Qual é a capital do Brasil?</p>
          <input
            value={q2}
            onChange={(e) => setQ2(e.target.value)}
            style={{ width: "100%", padding: "10px" }}
            disabled={bloqueado}
          />
        </div>

        <button
          onClick={enviarProva}
          disabled={bloqueado}
          style={{
            marginTop: "20px",
            width: "100%",
            padding: "12px",
            background: bloqueado ? "#9ca3af" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "5px",
            cursor: bloqueado ? "not-allowed" : "pointer",
            opacity: bloqueado ? 0.8 : 1
          }}
        >
          {bloqueado ? "Prova bloqueada por suspeita de cola" : "Enviar Prova"}
        </button>

        <p style={{ marginTop: "10px", textAlign: "center" }}>
          {mensagem}
        </p>
      </div>
    </div>
  )
}
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
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

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

  async function enviarProva() {
    if (!nome.trim()) {
      setMensagem("Digite seu nome!")
      return
    }

    if (enviado) {
      setMensagem("Prova já enviada ✅")
      return
    }

    setEnviando(true)
    setMensagem("")

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
        setEnviado(true)
      }
    } catch (err) {
      console.log("FALHA:", err)
      setMensagem("Falha geral!")
    } finally {
      setEnviando(false)
    }
  }

  // 🔒 Tela de senha premium
  if (!liberado) {
    return (
      <div style={styles.authWrapper}>
        <div style={styles.authCard}>
          <div style={styles.badge}>Student Access</div>
          <h1 style={styles.authTitle}>📝 Acesso à Prova</h1>
          <p style={styles.authSubtitle}>
            Digite a senha para começar sua avaliação
          </p>

          <input
            type="password"
            placeholder="Digite a senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
          />

          <button onClick={verificarSenha} style={styles.primaryButton}>
            Entrar na prova
          </button>

          <p style={styles.message}>{mensagem}</p>
        </div>
      </div>
    )
  }

  // ✅ Tela premium da prova
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.hero}>
          <div>
            <div style={styles.badge}>Student Area</div>
            <h1 style={styles.title}>📝 Prova Simples</h1>
            <p style={styles.subtitle}>
              Responda às questões abaixo e envie quando terminar
            </p>
          </div>
        </div>

        <div style={styles.card}>
          {/* Nome */}
          <div style={styles.fieldBlock}>
            <label style={styles.label}>Nome do aluno</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={styles.input}
              placeholder="Digite seu nome completo"
              disabled={enviado}
            />
          </div>

          {/* Questão 1 */}
          <div style={styles.questionCard}>
            <div style={styles.questionTop}>
              <div style={styles.questionNumber}>01</div>
              <div>
                <h3 style={styles.questionTitle}>Qual é 2 + 2?</h3>
                <p style={styles.questionSubtitle}>Digite sua resposta</p>
              </div>
            </div>

            <input
              type="text"
              value={q1}
              onChange={(e) => setQ1(e.target.value)}
              style={styles.input}
              placeholder="Sua resposta"
              disabled={enviado}
            />
          </div>

          {/* Questão 2 */}
          <div style={styles.questionCard}>
            <div style={styles.questionTop}>
              <div style={styles.questionNumber}>02</div>
              <div>
                <h3 style={styles.questionTitle}>Qual é a capital do Brasil?</h3>
                <p style={styles.questionSubtitle}>Digite sua resposta</p>
              </div>
            </div>

            <input
              type="text"
              value={q2}
              onChange={(e) => setQ2(e.target.value)}
              style={styles.input}
              placeholder="Sua resposta"
              disabled={enviado}
            />
          </div>

          {/* Botão */}
          <button
            onClick={enviarProva}
            disabled={enviado || enviando}
            style={{
              ...styles.submitButton,
              opacity: enviado || enviando ? 0.7 : 1,
              cursor: enviado || enviando ? "not-allowed" : "pointer",
            }}
          >
            {enviando
              ? "Enviando..."
              : enviado
              ? "Prova já enviada"
              : "Enviar Prova"}
          </button>

          <p style={styles.message}>{mensagem}</p>
        </div>
      </div>
    </div>
  )
}

// 🎨 Visual premium / SaaS
const styles: any = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff, #ffffff)",
    padding: "32px",
  },

  container: {
    maxWidth: "820px",
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
  },

  hero: {
    marginBottom: "24px",
  },

  badge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
    marginBottom: "10px",
  },

  title: {
    margin: 0,
    fontSize: "34px",
    color: "#111827",
  },

  subtitle: {
    marginTop: "10px",
    color: "#6b7280",
    fontSize: "15px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  },

  fieldBlock: {
    marginBottom: "20px",
  },

  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: "bold",
    color: "#111827",
  },

  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
    outline: "none",
  },

  questionCard: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "18px",
    marginBottom: "16px",
  },

  questionTop: {
    display: "flex",
    gap: "14px",
    alignItems: "flex-start",
    marginBottom: "12px",
  },

  questionNumber: {
    width: "40px",
    height: "40px",
    borderRadius: "999px",
    background: "#2563eb",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    flexShrink: 0,
  },

  questionTitle: {
    margin: 0,
    fontSize: "18px",
    color: "#111827",
  },

  questionSubtitle: {
    marginTop: "6px",
    marginBottom: 0,
    color: "#6b7280",
    fontSize: "14px",
  },

  submitButton: {
    width: "100%",
    padding: "14px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: "16px",
    marginTop: "8px",
  },

  message: {
    marginTop: "14px",
    textAlign: "center",
    fontWeight: "bold",
    color: "#111827",
  },

  authWrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    fontFamily: "Arial, sans-serif",
    padding: "20px",
  },

  authCard: {
    background: "#ffffff",
    padding: "32px",
    borderRadius: "20px",
    width: "100%",
    maxWidth: "400px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  },

  authTitle: {
    margin: 0,
    textAlign: "center",
    color: "#111827",
  },

  authSubtitle: {
    marginTop: "10px",
    marginBottom: "16px",
    textAlign: "center",
    color: "#6b7280",
  },

  primaryButton: {
    width: "100%",
    padding: "14px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
    fontWeight: "bold",
    marginTop: "14px",
  },
};
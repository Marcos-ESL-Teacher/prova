"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {

  const [senha, setSenha] = useState("")
  const [autorizado, setAutorizado] = useState(false)
  const [mensagem, setMensagem] = useState("")

  const [dados, setDados] = useState<any[]>([])
  const [carregando, setCarregando] = useState(false)

  async function verificarSenhaProfessor() {
    setMensagem("")

    try {
      const res = await fetch("/api/verify-admin-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: senha })
      })

      const data = await res.json()

      if (data.ok) {
        setAutorizado(true)
        carregarProvas()
      } else {
        setMensagem("Senha incorreta ❌")
      }

    } catch {
      setMensagem("Erro ao validar senha.")
    }
  }

  async function carregarProvas() {
    setCarregando(true)

    const { data, error } = await supabase
      .from("exam_submissions")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      alert(error.message)
      setCarregando(false)
      return
    }

    setDados(data || [])
    setCarregando(false)
  }

  // 🔒 BLOQUEIO
  if (!autorizado) {
    return (
      <div style={styles.loginWrapper}>
        <div style={styles.loginCard}>

          <h2 style={styles.title}>🔒 Painel do Professor</h2>

          <input
            type="password"
            placeholder="Digite a senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
          />

          <button
            onClick={verificarSenhaProfessor}
            style={styles.button}
          >
            Entrar
          </button>

          <p style={styles.msg}>{mensagem}</p>

        </div>
      </div>
    )
  }

  // ✅ PAINEL
  return (
    <div style={styles.page}>

      <div style={styles.container}>

        <h1 style={styles.header}>👨‍🏫 Painel do Professor</h1>

        <button onClick={carregarProvas} style={styles.reload}>
          🔄 Atualizar
        </button>

        {carregando && <p>Carregando...</p>}

        {dados.length === 0 && !carregando && (
          <p>Nenhuma prova enviada.</p>
        )}

        <div style={styles.grid}>

          {dados.map((item) => (
            <div key={item.id} style={styles.card}>

              <h2 style={styles.student}>
                📁 {item.student_name}
              </h2>

              <div style={styles.infoGrid}>
                <p><strong>📚 Livro:</strong> {item.book_name}</p>
                <p><strong>📂 Pasta:</strong> {item.unit_folder}</p>
                <p><strong>📂 Subpasta:</strong> {item.subfolder_name}</p>
                <p><strong>📄 Prova:</strong> {item.exam_name}</p>
              </div>

              <p style={styles.date}>
                📅 {new Date(item.created_at).toLocaleString()}
              </p>

              <div style={styles.answers}>
                <pre style={{ margin: 0 }}>
                  {JSON.stringify(item.answers, null, 2)}
                </pre>
              </div>

            </div>
          ))}

        </div>

      </div>
    </div>
  )
}

/* 🎨 ESTILO PROFISSIONAL */
const styles: any = {

  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    padding: "30px"
  },

  container: {
    maxWidth: "900px",
    margin: "auto"
  },

  header: {
    textAlign: "center",
    marginBottom: "20px"
  },

  reload: {
    display: "block",
    margin: "0 auto 20px auto",
    padding: "12px 20px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold"
  },

  grid: {
    display: "grid",
    gap: "20px"
  },

  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
  },

  student: {
    marginTop: 0
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px"
  },

  date: {
    color: "#64748b",
    marginTop: "10px"
  },

  answers: {
    marginTop: "15px",
    background: "#eef2ff",
    padding: "12px",
    borderRadius: "10px"
  },

  loginWrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f3f4f6"
  },

  loginCard: {
    background: "#fff",
    padding: "30px",
    borderRadius: "16px",
    width: "300px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.1)"
  },

  title: {
    textAlign: "center"
  },

  input: {
    width: "100%",
    padding: "10px",
    marginTop: "10px"
  },

  button: {
    width: "100%",
    marginTop: "15px",
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },

  msg: {
    marginTop: "10px",
    textAlign: "center"
  }

}

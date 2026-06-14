"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

// ✅ normalizar texto
function normalizar(texto: string) {
  return (texto || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// ✅ corrigir respostas
function corrigir(answers: any) {
  const r1 = normalizar(answers?.pergunta1 || "");
  const r2 = normalizar(answers?.pergunta2 || "");

  const acertos =
    (r1 === "4" || r1 === "quatro" ? 1 : 0) +
    (r2 === "brasilia" ? 1 : 0);

  return {
    nota: acertos,
    total: 2,
    percentual: Math.round((acertos / 2) * 100),
  };
}

// ✅ agrupar por aluno
function agruparPorAluno(dados: any[]) {
  const estrutura: Record<string, any[]> = {};

  dados.forEach((item) => {
    const aluno = item.student_name || "Sem nome";

    if (!estrutura[aluno]) {
      estrutura[aluno] = [];
    }

    estrutura[aluno].push(item);
  });

  return estrutura;
}

export default function AdminPage() {

  // 🔒 login
  const [senha, setSenha] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // 📊 dados
  const [dados, setDados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  // ✅ validar senha
  async function verificarSenhaProfessor() {
    setMensagem("");

    try {
      const res = await fetch("/api/verify-admin-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: senha })
      });

      const data = await res.json();

      if (data.ok) {
        setAutorizado(true);
        carregarProvas();
      } else {
        setMensagem(data.message || "Senha incorreta ❌");
      }
    } catch {
      setMensagem("Erro ao validar senha.");
    }
  }

  // ✅ carregar dados
  async function carregarProvas() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("exam_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar: " + error.message);
      setCarregando(false);
      return;
    }

    setDados(data || []);
    setCarregando(false);
  }

  function sair() {
    setAutorizado(false);
    setSenha("");
    setMensagem("");
    setDados([]);
  }

  // 🔒 LOGIN
  if (!autorizado) {
    return (
      <div style={styles.loginWrapper}>
        <div style={styles.loginCard}>

          <h2 style={styles.loginTitle}>
            🔒 Painel do Professor
          </h2>

          <input
            type="password"
            placeholder="Senha do professor"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
          />

          <button onClick={verificarSenhaProfessor} style={styles.primaryButton}>
            Entrar
          </button>

          <p style={styles.msg}>{mensagem}</p>

        </div>
      </div>
    );
  }

  const estrutura = agruparPorAluno(dados);

  // ✅ PAINEL
  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <h1 style={styles.header}>
          👨‍🏫 Painel do Professor
        </h1>

        <div style={styles.topButtons}>
          <button onClick={carregarProvas} style={styles.primaryButton}>
            🔄 Atualizar
          </button>

          <button onClick={sair} style={styles.logoutButton}>
            Sair
          </button>
        </div>

        {carregando && (
          <p style={styles.center}>Carregando provas...</p>
        )}

        {!carregando && dados.length === 0 && (
          <p style={styles.center}>Nenhuma prova enviada.</p>
        )}

        <div style={styles.grid}>

          {Object.entries(estrutura).map(([aluno, provas]) => (

            <div key={aluno} style={styles.alunoCard}>

              <h2 style={styles.alunoTitulo}>
                📁 {aluno}
              </h2>

              {provas.map((item: any) => {

                const resultado = corrigir(item.answers);
                const aprovado = resultado.percentual >= 50;

                return (
                  <div key={item.id} style={styles.provaCard}>

                    <div style={styles.infoGrid}>
                      <p><b>📄 Prova:</b> {item.exam_name}</p>
                      <p><b>📚 Livro:</b> {item.book_name}</p>
                      <p><b>📂 Pasta:</b> {item.unit_folder}</p>
                      <p><b>📂 Subpasta:</b> {item.subfolder_name}</p>
                    </div>

                    <p style={styles.data}>
                      📅 {new Date(item.created_at).toLocaleString()}
                    </p>

                    <p style={{
                      ...styles.nota,
                      color: aprovado ? "#16a34a" : "#dc2626"
                    }}>
                      Nota: {resultado.nota}/2 ({resultado.percentual}%)
                    </p>

                    <div style={styles.respostasBox}>
                      <pre style={styles.pre}>
                        {JSON.stringify(item.answers, null, 2)}
                      </pre>
                    </div>

                  </div>
                );

              })}

            </div>

          ))}

        </div>

      </div>
    </div>
  );
}

// ✅ ESTILO PROFISSIONAL
const styles: any = {

  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff, #ffffff)",
    padding: "40px"
  },

  container: {
    maxWidth: "1000px",
    margin: "auto",
    fontFamily: "Arial"
  },

  header: {
    textAlign: "center",
    fontSize: "34px",
    marginBottom: "30px"
  },

  topButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "15px",
    marginBottom: "30px"
  },

  grid: {
    display: "grid",
    gap: "25px"
  },

  alunoCard: {
    background: "#fff",
    borderRadius: "20px",
    padding: "20px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
  },

  alunoTitulo: {
    marginBottom: "15px"
  },

  provaCard: {
    background: "#f8fafc",
    borderRadius: "12px",
    padding: "15px",
    marginTop: "10px"
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px"
  },

  data: {
    color: "#64748b",
    marginTop: "10px"
  },

  nota: {
    fontWeight: "bold",
    marginTop: "10px"
  },

  respostasBox: {
    marginTop: "10px",
    background: "#e0e7ff",
    padding: "10px",
    borderRadius: "8px"
  },

  pre: {
    margin: 0
  },

  center: {
    textAlign: "center",
    marginTop: "20px"
  },

  loginWrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center"
  },

  loginCard: {
    background: "#fff",
    padding: "30px",
    borderRadius: "15px",
    width: "320px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
  },

  loginTitle: {
    textAlign: "center"
  },

  input: {
    width: "100%",
    padding: "10px",
    marginTop: "10px",
    borderRadius: "8px"
  },

  primaryButton: {
    marginTop: "10px",
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },

  logoutButton: {
    padding: "10px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
  },

  msg: {
    marginTop: "10px",
    textAlign: "center"
  }
};
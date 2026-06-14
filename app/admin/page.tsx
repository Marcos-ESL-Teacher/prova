"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";

function normalizar(texto: string) {
  return (texto || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

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

function agruparPorAluno(dados: any[]) {
  const estrutura: Record<string, any[]> = {};

  for (const item of dados) {
    const aluno = item.student_name || "Sem nome";
    if (!estrutura[aluno]) estrutura[aluno] = [];
    estrutura[aluno].push(item);
  }

  return estrutura;
}

export default function AdminPage() {
  const [senha, setSenha] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [dados, setDados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

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
        await carregarProvas();
      } else {
        setMensagem(data.message || "Senha incorreta ❌");
      }
    } catch {
      setMensagem("Erro ao validar senha.");
    }
  }

  async function carregarProvas() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("exam_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar provas: " + error.message);
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

  if (!autorizado) {
    return (
      <div style={styles.loginWrapper}>
        <div style={styles.loginCard}>
          <h2 style={styles.loginTitle}>🔒 Painel do Professor</h2>

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

          <p style={styles.mensagem}>{mensagem}</p>
        </div>
      </div>
    );
  }

  const estrutura = agruparPorAluno(dados);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.header}>👨‍🏫 Painel do Professor</h1>

        <div style={styles.topButtons}>
          <button onClick={carregarProvas} style={styles.primaryButton}>
            🔄 Atualizar
          </button>

          <button onClick={sair} style={styles.logoutButton}>
            Sair
          </button>
        </div>

        {carregando && (
          <p style={{ textAlign: "center", marginTop: 20 }}>Carregando provas...</p>
        )}

        {!carregando && dados.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 20 }}>
            Nenhuma prova enviada ainda.
          </p>
        )}

        <div style={styles.grid}>
          {Object.entries(estrutura).map(([aluno, provas]) => (
            <div key={aluno} style={styles.alunoCard}>
              <h2 style={styles.alunoTitulo}>📁 {aluno}</h2>

              <div style={styles.provasList}>
                {provas.map((item: any) => {
                  const resultado = corrigir(item.answers || {});
                  const aprovado = resultado.percentual >= 50;

                  return (
                    <div key={item.id} style={styles.provaCard}>
                      <div style={styles.infoGrid}>
                        <p><strong>📄 Prova:</strong> {item.exam_name}</p>
                        <p><strong>📚 Livro:</strong> {item.book_name}</p>
                        <p><strong>📂 Pasta:</strong> {item.unit_folder}</p>
                        <p><strong>📂 Subpasta:</strong> {item.subfolder_name}</p>
                      </div>

                      <p style={styles.dataTexto}>
                        📅 {new Date(item.created_at).toLocaleString()}
                      </p>

                      <p
                        style={{
                          ...styles.notaTexto,
                          color: aprovado ? "#16a34a" : "#dc2626"
                        }}
                      >
                        Nota: {resultado.nota}/{resultado.total} ({resultado.percentual}%)
                      </p>

                      <div style={styles.answersBox}>
                        <pre style={styles.answersPre}>
                          {JSON.stringify(item.answers, null, 2)}
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    padding: "30px",
  },

  container: {
    maxWidth: "1000px",
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    textAlign: "center",
    fontSize: "34px",
    marginBottom: "25px",
    color: "#111827",
  },

  topButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    marginBottom: "25px",
  },

  grid: {
    display: "grid",
    gap: "24px",
  },

  alunoCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },

  alunoTitulo: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "24px",
    color: "#111827",
  },

  provasList: {
    display: "grid",
    gap: "16px",
  },

  provaCard: {
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "16px",
    border: "1px solid #e5e7eb",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px",
  },

  dataTexto: {
    color: "#64748b",
    marginTop: "12px",
    marginBottom: "8px",
  },

  notaTexto: {
    fontWeight: "bold",
    marginTop: "6px",
    marginBottom: "12px",
  },

  answersBox: {
    background: "#e0e7ff",
    borderRadius: "10px",
    padding: "12px",
  },

  answersPre: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: "14px",
  },

  loginWrapper: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    fontFamily: "Arial, sans-serif",
  },

  loginCard: {
    background: "#ffffff",
    padding: "30px",
    borderRadius: "16px",
    width: "100%",
    maxWidth: "360px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },

  loginTitle: {
    textAlign: "center",
    marginTop: 0,
    marginBottom: "18px",
  },

  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
  },

  primaryButton: {
    padding: "12px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  logoutButton: {
    padding: "12px 16px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  mensagem: {
    marginTop: "12px",
    textAlign: "center",
    fontWeight: "bold",
  },
};
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
    if (!estrutura[aluno]) estrutura[aluno] = [];
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

  async function carregarProvas() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("exam_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro: " + error.message);
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
          <h2>🔒 Painel do Professor</h2>

          <input
            type="password"
            placeholder="Senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
          />

          <button onClick={verificarSenhaProfessor} style={styles.button}>
            Entrar
          </button>

          <p>{mensagem}</p>
        </div>
      </div>
    );
  }

  const estrutura = agruparPorAluno(dados);

  // ✅ PAINEL
  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <h1 style={styles.header}>👨‍🏫 Painel do Professor</h1>

        <div style={styles.top}>
          <button onClick={carregarProvas} style={styles.button}>
            🔄 Atualizar
          </button>

          <button onClick={sair} style={styles.logout}>
            Sair
          </button>
        </div>

        {carregando && <p style={styles.center}>Carregando...</p>}

        {!carregando && dados.length === 0 && (
          <p style={styles.center}>Nenhuma prova encontrada</p>
        )}

        <div style={styles.grid}>

          {Object.entries(estrutura).map(([aluno, provas]) => (
            <div key={aluno} style={styles.cardAluno}>

              <h2>📁 {aluno}</h2>

              {provas.map((item: any) => {

                const r = corrigir(item.answers);
                const aprovado = r.percentual >= 50;

                return (
                  <div key={item.id} style={styles.cardProva}>

                    <div style={styles.headerProva}>
                      <h3>📄 {item.exam_name}</h3>
                      <span style={{
                        ...styles.badge,
                        background: aprovado ? "#16a34a" : "#dc2626"
                      }}>
                        {r.percentual}%
                      </span>
                    </div>

                    <div style={styles.infoGrid}>
                      <span>📚 {item.book_name}</span>
                      <span>📂 {item.unit_folder}</span>
                      <span>📂 {item.subfolder_name}</span>
                    </div>

                    <div style={styles.data}>
                      📅 {new Date(item.created_at).toLocaleString()}
                    </div>

                    <div style={styles.respostas}>
                      <b>Respostas:</b><br/>
                      1: {item.answers?.pergunta1 || "-"}<br/>
                      2: {item.answers?.pergunta2 || "-"}
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

// 🎨 ESTILO PROFISSIONAL
const styles: any = {

  page: {
    background: "linear-gradient(135deg, #eef2ff, #ffffff)",
    minHeight: "100vh",
    padding: "40px"
  },

  container: {
    maxWidth: "1000px",
    margin: "auto",
    fontFamily: "Arial"
  },

  header: {
    textAlign: "center",
    marginBottom: "30px"
  },

  top: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "25px"
  },

  grid: {
    display: "grid",
    gap: "25px"
  },

  cardAluno: {
    background: "#fff",
    padding: "20px",
    borderRadius: "16px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)"
  },

  cardProva: {
    background: "#f8fafc",
    padding: "15px",
    borderRadius: "12px",
    marginTop: "10px"
  },

  headerProva: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  badge: {
    color: "#fff",
    padding: "5px 10px",
    borderRadius: "8px",
    fontWeight: "bold"
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "6px",
    marginTop: "10px"
  },

  data: {
    color: "#64748b",
    marginTop: "10px"
  },

  respostas: {
    marginTop: "10px",
    background: "#e0e7ff",
    padding: "10px",
    borderRadius: "8px"
  },

  center: {
    textAlign: "center"
  },

  loginWrapper: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh"
  },

  loginCard: {
    background: "#fff",
    padding: "30px",
    borderRadius: "12px"
  },

  input: {
    width: "100%",
    padding: "10px",
    marginTop: "10px"
  },

  button: {
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer"
  },

  logout: {
    padding: "10px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "6px"
  }

};

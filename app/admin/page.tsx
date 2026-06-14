"use client";

import { useMemo, useState } from "react";
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

  // 🔎 filtro
  const [filtroAluno, setFiltroAluno] = useState("");

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
    setFiltroAluno("");
  }

  const dadosFiltrados = useMemo(() => {
    return dados.filter((item) => {
      const aluno = (item.student_name || "").toLowerCase();
      return aluno.includes(filtroAluno.toLowerCase());
    });
  }, [dados, filtroAluno]);

  const estrutura = useMemo(() => {
    return agruparPorAluno(dadosFiltrados);
  }, [dadosFiltrados]);

  const totalProvas = dados.length;
  const totalAlunos = new Set(
    dados.map((item) => item.student_name || "Sem nome")
  ).size;

  const mediaPercentual = useMemo(() => {
    if (dados.length === 0) return 0;
    const total = dados.reduce((acc, item) => {
      const r = corrigir(item.answers || {});
      return acc + r.percentual;
    }, 0);
    return Math.round(total / dados.length);
  }, [dados]);

  // 🔒 LOGIN
  if (!autorizado) {
    return (
      <div style={styles.loginWrapper}>
        <div style={styles.loginCard}>
          <div style={styles.loginTopBadge}>Teacher Access</div>

          <h2 style={styles.loginTitle}>👨‍🏫 Painel do Professor</h2>
          <p style={styles.loginSubtitle}>
            Acesse o painel premium das provas
          </p>

          <input
            type="password"
            placeholder="Senha do professor"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
          />

          <button onClick={verificarSenhaProfessor} style={styles.primaryButton}>
            Entrar no painel
          </button>

          <p style={styles.mensagem}>{mensagem}</p>
        </div>
      </div>
    );
  }

  // ✅ PAINEL PREMIUM
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.hero}>
          <div>
            <div style={styles.heroBadge}>Painel premium</div>
            <h1 style={styles.header}>👨‍🏫 Painel do Professor</h1>
            <p style={styles.subtitle}>
              Visual premium com métricas, agrupamento por aluno e correção automática
            </p>
          </div>

          <div style={styles.topButtons}>
            <button onClick={carregarProvas} style={styles.primaryButton}>
              🔄 Atualizar
            </button>

            <button onClick={sair} style={styles.logoutButton}>
              Sair
            </button>
          </div>
        </div>

        {/* 📊 RESUMO */}
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Total de provas</div>
            <div style={styles.summaryNumber}>{totalProvas}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Alunos únicos</div>
            <div style={styles.summaryNumber}>{totalAlunos}</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryLabel}>Média geral</div>
            <div style={styles.summaryNumber}>{mediaPercentual}%</div>
          </div>
        </div>

        {/* 🔎 FILTRO */}
        <div style={styles.filterCard}>
          <input
            type="text"
            placeholder="Filtrar por aluno..."
            value={filtroAluno}
            onChange={(e) => setFiltroAluno(e.target.value)}
            style={styles.filterInput}
          />
        </div>

        {carregando && <p style={styles.center}>Carregando provas...</p>}

        {!carregando && dados.length === 0 && (
          <p style={styles.center}>Nenhuma prova enviada ainda.</p>
        )}

        {!carregando && dados.length > 0 && dadosFiltrados.length === 0 && (
          <p style={styles.center}>Nenhum aluno encontrado nesse filtro.</p>
        )}

        <div style={styles.grid}>
          {Object.entries(estrutura).map(([aluno, provas]) => (
            <div key={aluno} style={styles.alunoCard}>
              <div style={styles.alunoHeader}>
                <h2 style={styles.alunoTitulo}>📁 {aluno}</h2>
                <span style={styles.alunoChip}>
                  {provas.length} prova(s)
                </span>
              </div>

              <div style={styles.provasList}>
                {provas.map((item: any) => {
                  const resultado = corrigir(item.answers || {});
                  const aprovado = resultado.percentual >= 50;

                  return (
                    <div key={item.id} style={styles.provaCard}>
                      <div style={styles.provaHeader}>
                        <h3 style={styles.provaTitulo}>📄 {item.exam_name}</h3>
                        <span
                          style={{
                            ...styles.badgeNota,
                            background: aprovado ? "#16a34a" : "#dc2626"
                          }}
                        >
                          {resultado.percentual}%
                        </span>
                      </div>

                      <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Livro</span>
                          <span style={styles.infoValue}>📚 {item.book_name}</span>
                        </div>

                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Pasta</span>
                          <span style={styles.infoValue}>📂 {item.unit_folder}</span>
                        </div>

                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Subpasta</span>
                          <span style={styles.infoValue}>📂 {item.subfolder_name}</span>
                        </div>

                        <div style={styles.infoItem}>
                          <span style={styles.infoLabel}>Enviado em</span>
                          <span style={styles.infoValue}>
                            📅 {new Date(item.created_at).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      <div style={styles.notaLinha}>
                        <span style={styles.notaTitulo}>Desempenho</span>
                        <strong
                          style={{
                            color: aprovado ? "#166534" : "#991b1b",
                            fontSize: "16px"
                          }}
                        >
                          {resultado.nota}/{resultado.total}
                        </strong>
                      </div>

                      <div style={styles.progressTrack}>
                        <div
                          style={{
                            ...styles.progressFill,
                            width: `${resultado.percentual}%`,
                            background: aprovado ? "#16a34a" : "#dc2626"
                          }}
                        />
                      </div>

                      <div style={styles.answersBox}>
                        <div style={styles.answersTitle}>Respostas</div>
                        <div style={styles.answerRow}>
                          <span style={styles.answerLabel}>Pergunta 1</span>
                          <span style={styles.answerValue}>
                            {item.answers?.pergunta1 || "-"}
                          </span>
                        </div>
                        <div style={styles.answerRow}>
                          <span style={styles.answerLabel}>Pergunta 2</span>
                          <span style={styles.answerValue}>
                            {item.answers?.pergunta2 || "-"}
                          </span>
                        </div>
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
    background: "linear-gradient(135deg, #eef2ff, #ffffff)",
    padding: "36px",
  },

  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    fontFamily: "Arial, sans-serif",
  },

  hero: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "28px",
  },

  heroBadge: {
    display: "inline-block",
    background: "#dbeafe",
    color: "#1d4ed8",
    padding: "6px 12px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
    marginBottom: "10px",
  },

  header: {
    margin: 0,
    fontSize: "36px",
    color: "#111827",
  },

  subtitle: {
    marginTop: "10px",
    color: "#6b7280",
    fontSize: "15px",
  },

  topButtons: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },

  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
    marginBottom: "24px",
  },

  summaryCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "18px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
  },

  summaryLabel: {
    color: "#6b7280",
    fontSize: "14px",
    marginBottom: "8px",
  },

  summaryNumber: {
    fontSize: "30px",
    fontWeight: "800",
    color: "#111827",
  },

  filterCard: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    border: "1px solid #e5e7eb",
    marginBottom: "24px",
  },

  filterInput: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
    outline: "none",
  },

  grid: {
    display: "grid",
    gap: "24px",
  },

  alunoCard: {
    background: "#ffffff",
    borderRadius: "20px",
    padding: "22px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  },

  alunoHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginBottom: "16px",
  },

  alunoTitulo: {
    margin: 0,
    fontSize: "24px",
    color: "#111827",
  },

  alunoChip: {
    background: "#f3f4f6",
    color: "#111827",
    padding: "6px 12px",
    borderRadius: "999px",
    fontSize: "13px",
    fontWeight: "bold",
  },

  provasList: {
    display: "grid",
    gap: "16px",
  },

  provaCard: {
    background: "#f8fafc",
    borderRadius: "16px",
    padding: "18px",
    border: "1px solid #e5e7eb",
  },

  provaHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
    marginBottom: "14px",
  },

  provaTitulo: {
    margin: 0,
    fontSize: "18px",
    color: "#111827",
  },

  badgeNota: {
    color: "#fff",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "13px",
  },

  infoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
    marginBottom: "14px",
  },

  infoItem: {
    background: "#ffffff",
    borderRadius: "12px",
    padding: "12px",
    border: "1px solid #e5e7eb",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },

  infoLabel: {
    color: "#6b7280",
    fontSize: "12px",
    fontWeight: "bold",
    textTransform: "uppercase",
  },

  infoValue: {
    color: "#111827",
    fontSize: "14px",
    fontWeight: 600,
  },

  notaLinha: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "8px",
    marginBottom: "10px",
  },

  notaTitulo: {
    color: "#374151",
    fontWeight: "bold",
  },

  progressTrack: {
    width: "100%",
    height: "10px",
    borderRadius: "999px",
    background: "#e5e7eb",
    overflow: "hidden",
    marginBottom: "16px",
  },

  progressFill: {
    height: "100%",
    borderRadius: "999px",
  },

  answersBox: {
    background: "#e0e7ff",
    borderRadius: "12px",
    padding: "14px",
  },

  answersTitle: {
    fontWeight: "bold",
    marginBottom: "10px",
    color: "#1e3a8a",
  },

  answerRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "10px",
    padding: "8px 0",
    borderBottom: "1px solid rgba(30,58,138,0.08)",
  },

  answerLabel: {
    fontWeight: "bold",
    color: "#374151",
  },

  answerValue: {
    color: "#111827",
  },

  center: {
    textAlign: "center",
    marginTop: "20px",
    color: "#6b7280",
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
    padding: "32px",
    borderRadius: "18px",
    width: "100%",
    maxWidth: "380px",
    boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
    border: "1px solid #e5e7eb",
  },

  loginTitle: {
    textAlign: "center",
    marginTop: 0,
    marginBottom: "18px",
    color: "#111827",
  },

  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "1px solid #d1d5db",
    fontSize: "15px",
    outline: "none",
  },

  primaryButton: {
    padding: "12px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  logoutButton: {
    padding: "12px 16px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  mensagem: {
    marginTop: "12px",
    textAlign: "center",
    fontWeight: "bold",
  },
};
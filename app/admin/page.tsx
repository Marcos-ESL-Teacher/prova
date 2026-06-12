"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
);

function normalizar(texto: string) {
  return (texto || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function corrigir(answers: any) {
  const r1 = normalizar(answers?.pergunta1 || answers?.q1 || "");
  const r2 = normalizar(answers?.pergunta2 || answers?.q2 || "");

  const acertos =
    (r1 === "brasilia" ? 1 : 0) +
    (r2 === "4" || r2 === "quatro" ? 1 : 0);

  return {
    nota: acertos,
    total: 2,
    percentual: Math.round((acertos / 2) * 100),
  };
}

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const [user, setUser] = useState<any>(null);
  const [dados, setDados] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function verificarSessaoInicial() {
    const { data } = await supabase.auth.getUser();
    setUser(data.user || null);
    setCarregando(false);

    if (data.user) {
      await carregarTudo();
    }
  }

  async function login() {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      alert("Erro no login: " + error.message);
      return;
    }

    setUser(data.user);
    await carregarTudo();
  }

  async function logout() {
    await supabase.auth.signOut();
    setUser(null);
    setDados([]);
    setLogs([]);
  }

  async function carregarTudo() {
    await Promise.all([carregarProvas(), carregarLogs()]);
  }

  async function carregarProvas() {
    const { data, error } = await supabase
      .from("exam_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Erro ao carregar provas: " + error.message);
      return;
    }

    setDados(data || []);
  }

  async function carregarLogs() {
    const { data, error } = await supabase
      .from("exam_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setLogs([]);
      return;
    }

    setLogs(data || []);
  }

  async function apagarProva(id: string) {
    const confirmar = confirm("Tem certeza que deseja apagar esta prova?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("exam_submissions")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erro ao apagar: " + error.message);
      return;
    }

    alert("✅ Prova apagada!");
    await carregarProvas();
  }

  useEffect(() => {
    verificarSessaoInicial();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user || null);

        if (session?.user) {
          await carregarTudo();
        } else {
          setDados([]);
          setLogs([]);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  if (carregando) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.loadingBox}>
          <h1 style={styles.loadingTitle}>Carregando painel...</h1>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <h1 style={styles.loginTitle}>🔒 Login do Professor</h1>
            <p style={styles.loginSubtitle}>
              Acesse o painel administrativo da prova
            </p>
          </div>

          <input
            type="email"
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={styles.input}
          />

          <input
            type="password"
            placeholder="Sua senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={styles.input}
          />

          <button onClick={login} style={styles.primaryButton}>
            Entrar no painel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.pageTitle}>👨‍🏫 Painel do Professor</h1>
          <p style={styles.pageSubtitle}>Logado como: {user.email}</p>
        </div>

        <div style={styles.topActions}>
          <button onClick={carregarTudo} style={styles.secondaryButton}>
            🔄 Atualizar
          </button>

          <button onClick={logout} style={styles.darkButton}>
            Sair
          </button>
        </div>
      </div>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>📋 Provas enviadas</h2>

        {dados.length === 0 && (
          <div style={styles.emptyState}>
            <p>Nenhuma prova enviada ainda.</p>
          </div>
        )}

        <div style={styles.grid}>
          {dados.map((item) => {
            const resultado = corrigir(item.answers || {});

            return (
              <div key={item.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <div>
                    <h3 style={styles.studentName}>
                      🧑‍🎓 {item.student_name || "Sem nome"}
                    </h3>
                    <p style={styles.smallText}>📅 {item.created_at}</p>
                  </div>

                  <button
                    onClick={() => apagarProva(item.id)}
                    style={styles.deleteButton}
                  >
                    🗑️ Apagar
                  </button>
                </div>

                <div style={styles.metricsRow}>
                  <div style={styles.metricBox}>
                    <span style={styles.metricLabel}>Nota</span>
                    <strong style={styles.metricValue}>
                      {resultado.nota}/{resultado.total}
                    </strong>
                  </div>

                  <div style={styles.metricBox}>
                    <span style={styles.metricLabel}>Percentual</span>
                    <strong style={styles.metricValue}>
                      {resultado.percentual}%
                    </strong>
                  </div>
                </div>

                <div style={styles.answersBox}>
                  <strong style={styles.blockTitle}>Respostas</strong>
                  <pre style={styles.pre}>
                    {JSON.stringify(item.answers, null, 2)}
                  </pre>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>🚨 Eventos suspeitos</h2>

        {logs.length === 0 && (
          <div style={styles.emptyState}>
            <p>Nenhum evento suspeito registrado ainda.</p>
          </div>
        )}

        <div style={styles.logsList}>
          {logs.map((log) => (
            <div key={log.id} style={styles.logCard}>
              <div style={styles.logLeft}>
                <strong style={styles.logStudent}>
                  {log.student_name || "Sem nome"}
                </strong>
                <p style={styles.logEvent}>Evento: {log.evento}</p>
              </div>

              <div style={styles.logRight}>
                <span style={styles.logDate}>{log.created_at}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  fullscreen: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg, #eff6ff, #eef2ff, #faf5ff)",
    padding: 20,
    fontFamily: "Arial, sans-serif",
  },

  loadingBox: {
    background: "#fff",
    padding: 30,
    borderRadius: 20,
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
  },

  loadingTitle: {
    margin: 0,
  },

  loginCard: {
    width: "100%",
    maxWidth: 430,
    background: "#fff",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0 20px 50px rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  loginHeader: {
    marginBottom: 10,
  },

  loginTitle: {
    margin: 0,
    fontSize: 28,
    color: "#111827",
  },

  loginSubtitle: {
    marginTop: 8,
    color: "#6b7280",
  },

  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "1px solid #d1d5db",
    fontSize: 15,
    outline: "none",
  },

  primaryButton: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    border: "none",
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
  },

  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: 24,
    fontFamily: "Arial, sans-serif",
  },

  topBar: {
    maxWidth: 1200,
    margin: "0 auto 24px auto",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },

  pageTitle: {
    margin: 0,
    fontSize: 30,
    color: "#111827",
  },

  pageSubtitle: {
    marginTop: 8,
    color: "#6b7280",
  },

  topActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  secondaryButton: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },

  darkButton: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#111827",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },

  section: {
    maxWidth: 1200,
    margin: "0 auto 28px auto",
  },

  sectionTitle: {
    marginBottom: 16,
    fontSize: 24,
    color: "#111827",
  },

  emptyState: {
    background: "#fff",
    borderRadius: 18,
    padding: 18,
    border: "1px solid #e5e7eb",
    color: "#6b7280",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 18,
  },

  card: {
    background: "#fff",
    borderRadius: 20,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 22px rgba(0,0,0,0.05)",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },

  studentName: {
    margin: 0,
    color: "#111827",
    fontSize: 20,
  },

  smallText: {
    marginTop: 6,
    color: "#6b7280",
    fontSize: 13,
  },

  deleteButton: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "none",
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },

  metricsRow: {
    display: "flex",
    gap: 12,
    marginBottom: 16,
  },

  metricBox: {
    flex: 1,
    background: "#f8fafc",
    borderRadius: 14,
    padding: 14,
    border: "1px solid #e5e7eb",
  },

  metricLabel: {
    display: "block",
    color: "#6b7280",
    fontSize: 12,
    marginBottom: 6,
  },

  metricValue: {
    fontSize: 22,
    color: "#111827",
  },

  answersBox: {
    marginTop: 8,
  },

  blockTitle: {
    display: "block",
    marginBottom: 8,
    color: "#111827",
  },

  pre: {
    background: "#f1f5f9",
    padding: 12,
    borderRadius: 12,
    overflowX: "auto",
    fontSize: 13,
  },

  logsList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  logCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    border: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  logLeft: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },

  logStudent: {
    color: "#111827",
  },

  logEvent: {
    margin: 0,
    color: "#dc2626",
    fontWeight: 700,
  },

  logRight: {
    color: "#6b7280",
    fontSize: 13,
  },

  logDate: {
    whiteSpace: "nowrap",
  },
};

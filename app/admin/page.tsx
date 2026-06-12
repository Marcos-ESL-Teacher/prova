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

function agruparEstrutura(dados: any[]) {
  const estrutura: Record<
    string,
    Record<string, Record<string, Record<string, any[]>>>
  > = {};

  for (const item of dados) {
    const aluno = item.student_name || "Sem nome";
    const livro = item.book_name || "Sem livro";
    const unidade = item.unit_folder || "Sem pasta";
    const subpasta = item.subfolder_name || "Sem subpasta";

    if (!estrutura[aluno]) estrutura[aluno] = {};
    if (!estrutura[aluno][livro]) estrutura[aluno][livro] = {};
    if (!estrutura[aluno][livro][unidade]) estrutura[aluno][livro][unidade] = {};
    if (!estrutura[aluno][livro][unidade][subpasta]) {
      estrutura[aluno][livro][unidade][subpasta] = [];
    }

    estrutura[aluno][livro][unidade][subpasta].push(item);
  }

  return estrutura;
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

  const estrutura = agruparEstrutura(dados);

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
        <h2 style={styles.sectionTitle}>📚 Estrutura por aluno / livro / pasta</h2>

        {dados.length === 0 && (
          <div style={styles.emptyState}>
            <p>Nenhuma prova enviada ainda.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {Object.entries(estrutura).map(([aluno, livros]) => (
            <div key={aluno} style={styles.folderCard}>
              <h2 style={{ marginTop: 0 }}>📁 {aluno}</h2>

              {Object.entries(livros).map(([livro, unidades]) => (
                <div key={livro} style={{ marginLeft: 20, marginBottom: 16 }}>
                  <h3>📂 {livro}</h3>

                  {Object.entries(unidades).map(([unidade, subpastas]) => (
                    <div
                      key={unidade}
                      style={{ marginLeft: 20, marginBottom: 12 }}
                    >
                      <h4>📂 {unidade}</h4>

                      {Object.entries(subpastas).map(([subpasta, provas]) => (
                        <div
                          key={subpasta}
                          style={{ marginLeft: 20, marginBottom: 12 }}
                        >
                          <h5>📂 {subpasta}</h5>

                          {(provas as any[]).map((item) => {
                            const resultado = corrigir(item.answers || {});

                            return (
                              <div key={item.id} style={styles.examBox}>
                                <strong>📄 {item.exam_name || "Prova sem nome"}</strong>
                                <p style={{ margin: "6px 0" }}>📚 {item.book_name}</p>
                                <p style={{ margin: "6px 0" }}>📂 {item.unit_folder}</p>
                                <p style={{ margin: "6px 0" }}>📂 {item.subfolder_name}</p>
                                <p style={{ margin: "6px 0" }}>📅 {item.created_at}</p>
                                <p style={{ margin: "6px 0" }}>
                                  Nota: {resultado.nota}/{resultado.total}
                                </p>
                                <p style={{ margin: "6px 0" }}>
                                  Percentual: {resultado.percentual}%
                                </p>

                                <pre style={styles.pre}>
                                  {JSON.stringify(item.answers, null, 2)}
                                </pre>

                                <button
                                  onClick={() => apagarProva(item.id)}
                                  style={styles.deleteButton}
                                >
                                  🗑️ Apagar esta prova
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
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

  folderCard: {
    background: "#fff",
    borderRadius: 20,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 22px rgba(0,0,0,0.05)",
  },

  examBox: {
    marginLeft: 20,
    padding: 12,
    background: "#f8fafc",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    marginBottom: 8,
  },

  pre: {
    background: "#eef2ff",
    padding: 10,
    borderRadius: 10,
    overflowX: "auto",
    fontSize: 13,
  },

  deleteButton: {
    marginTop: 8,
    padding: "8px 12px",
    borderRadius: 10,
    border: "none",
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
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
"use client";

import { useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

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
    (r1 === "4" || r1 === "quatro" ? 1 : 0) +
    (r2 === "brasilia" ? 1 : 0);

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

function contarEventosPorAluno(logs: any[]) {
  const mapa: Record<string, number> = {};

  for (const log of logs) {
    const aluno = log.student_name || "Sem nome";
    mapa[aluno] = (mapa[aluno] || 0) + 1;
  }

  return mapa;
}

export default function AdminPage() {
  // 🔒 login professor
  const [senha, setSenha] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  // 📊 dados
  const [dados, setDados] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  // 🎛️ filtros e ações
  const [filtroAluno, setFiltroAluno] = useState("");
  const [somenteSuspeitos, setSomenteSuspeitos] = useState(false);
  const [selecionados, setSelecionados] = useState<string[]>([]);

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
        await carregarTudo();
      } else {
        setMensagem(data.message || "Senha incorreta ❌");
      }
    } catch {
      setMensagem("Erro ao validar senha.");
    }
  }

  async function carregarTudo() {
    setCarregando(true);
    await Promise.all([carregarProvas(), carregarLogs()]);
    setCarregando(false);
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

  function toggleSelecionado(id: string) {
    setSelecionados((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  }

  async function apagarSelecionados() {
    if (selecionados.length === 0) {
      alert("Selecione pelo menos um evento.");
      return;
    }

    const confirmar = confirm("Deseja apagar os eventos selecionados?");
    if (!confirmar) return;

    const { error } = await supabase
      .from("exam_logs")
      .delete()
      .in("id", selecionados);

    if (error) {
      alert("Erro ao apagar: " + error.message);
      return;
    }

    alert("✅ Eventos selecionados apagados!");
    setSelecionados([]);
    await carregarLogs();
  }

  async function apagarTodosEventos() {
    if (logs.length === 0) {
      alert("Não há eventos para apagar.");
      return;
    }

    const confirmar = confirm("Deseja apagar TODOS os eventos suspeitos?");
    if (!confirmar) return;

    const ids = logs.map((log) => log.id);

    const { error } = await supabase
      .from("exam_logs")
      .delete()
      .in("id", ids);

    if (error) {
      alert("Erro ao apagar tudo: " + error.message);
      return;
    }

    alert("✅ Todos os eventos foram apagados!");
    setSelecionados([]);
    await carregarLogs();
  }

  function sair() {
    setAutorizado(false);
    setSenha("");
    setMensagem("");
    setDados([]);
    setLogs([]);
    setSelecionados([]);
    setFiltroAluno("");
    setSomenteSuspeitos(false);
  }

  const eventosPorAluno = useMemo(() => contarEventosPorAluno(logs), [logs]);

  const dadosFiltrados = useMemo(() => {
    return dados.filter((item) => {
      const aluno = item.student_name || "";
      const totalEventos = eventosPorAluno[aluno] || 0;

      const passouAluno = aluno
        .toLowerCase()
        .includes(filtroAluno.toLowerCase());

      const passouSuspeito = somenteSuspeitos ? totalEventos >= 3 : true;

      return passouAluno && passouSuspeito;
    });
  }, [dados, filtroAluno, somenteSuspeitos, eventosPorAluno]);

  const logsFiltrados = useMemo(() => {
    return logs.filter((log) => {
      const aluno = log.student_name || "";
      return aluno.toLowerCase().includes(filtroAluno.toLowerCase());
    });
  }, [logs, filtroAluno]);

  const estrutura = useMemo(() => agruparEstrutura(dadosFiltrados), [dadosFiltrados]);

  const rankingSuspeitos = useMemo(() => {
    return Object.entries(eventosPorAluno)
      .sort((a, b) => b[1] - a[1]);
  }, [eventosPorAluno]);

  const totalAlunos = useMemo(() => {
    return new Set(dados.map((d) => d.student_name || "Sem nome")).size;
  }, [dados]);

  const totalSuspeitos = useMemo(() => {
    return Object.values(eventosPorAluno).filter((n) => n >= 3).length;
  }, [eventosPorAluno]);

  const totalEventos = logs.length;

  function selecionarTodosVisiveis() {
    const idsVisiveis = logsFiltrados.map((log) => log.id);
    setSelecionados(idsVisiveis);
  }

  function limparSelecao() {
    setSelecionados([]);
  }

  if (!autorizado) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.loginCard}>
          <div style={styles.loginHeader}>
            <h1 style={styles.loginTitle}>🔒 Painel do Professor</h1>
            <p style={styles.loginSubtitle}>
              Digite a senha do professor para acessar o painel
            </p>
          </div>

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

          <p style={{ textAlign: "center", fontWeight: "bold" }}>{mensagem}</p>
        </div>
      </div>
    );
  }

  if (carregando) {
    return (
      <div style={styles.fullscreen}>
        <div style={styles.loadingBox}>
          <h1 style={styles.loadingTitle}>Carregando painel...</h1>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.topBar}>
          <div>
            <h1 style={styles.pageTitle}>👨‍🏫 Painel do Professor</h1>
            <p style={styles.pageSubtitle}>Painel protegido por senha</p>
          </div>

          <div style={styles.topActions}>
            <button onClick={carregarTudo} style={styles.secondaryButton}>
              🔄 Atualizar
            </button>
            <button onClick={sair} style={styles.darkButton}>
              Sair
            </button>
          </div>
        </div>

        {/* 📊 RESUMO */}
        <div style={styles.summaryGrid}>
          <div style={styles.summaryCard}>
            <div style={styles.summaryNumber}>{dados.length}</div>
            <div style={styles.summaryLabel}>Total de provas</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryNumber}>{totalAlunos}</div>
            <div style={styles.summaryLabel}>Alunos únicos</div>
          </div>

          <div style={styles.summaryCard}>
            <div style={styles.summaryNumber}>{totalEventos}</div>
            <div style={styles.summaryLabel}>Eventos suspeitos</div>
          </div>

          <div style={styles.summaryCardDanger}>
            <div style={styles.summaryNumber}>{totalSuspeitos}</div>
            <div style={styles.summaryLabel}>Alunos com 3+ eventos</div>
          </div>
        </div>

        {/* 🎛️ FILTROS */}
        <div style={styles.filterBar}>
          <input
            type="text"
            placeholder="Filtrar por aluno"
            value={filtroAluno}
            onChange={(e) => setFiltroAluno(e.target.value)}
            style={styles.filterInput}
          />

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={somenteSuspeitos}
              onChange={(e) => setSomenteSuspeitos(e.target.checked)}
            />
            Mostrar só suspeitos
          </label>
        </div>

        {/* 🚨 Ranking */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🏆 Ranking de Suspeitos</h2>

          {rankingSuspeitos.length === 0 && (
            <div style={styles.emptyState}>
              <p>Nenhum evento suspeito registrado ainda.</p>
            </div>
          )}

          <div style={{ display: "grid", gap: 12 }}>
            {rankingSuspeitos.map(([aluno, total], index) => (
              <div
                key={aluno}
                style={total >= 3 ? styles.rankCardDanger : styles.rankCard}
              >
                <strong>
                  #{index + 1} - {aluno}
                </strong>
                <span>{total} evento(s)</span>
              </div>
            ))}
          </div>
        </section>

        {/* 📚 PROVAS */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📚 Estrutura por aluno / livro / pasta</h2>

          {dadosFiltrados.length === 0 && (
            <div style={styles.emptyState}>
              <p>Nenhuma prova encontrada com esse filtro.</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {Object.entries(estrutura).map(([aluno, livros]) => {
              const totalAluno = eventosPorAluno[aluno] || 0;
              const alunoSuspeito = totalAluno >= 3;

              return (
                <div
                  key={aluno}
                  style={alunoSuspeito ? styles.folderCardDanger : styles.folderCard}
                >
                  <div style={styles.studentHeader}>
                    <h2 style={{ marginTop: 0, marginBottom: 0 }}>📁 {aluno}</h2>

                    {alunoSuspeito && (
                      <div style={styles.alertBadge}>
                        🚨 Suspeita de cola: {totalAluno} eventos
                      </div>
                    )}
                  </div>

                  {Object.entries(livros).map(([livro, unidades]) => (
                    <div key={livro} style={{ marginLeft: 20, marginBottom: 16 }}>
                      <h3>📂 {livro}</h3>

                      {Object.entries(unidades).map(([unidade, subpastas]) => (
                        <div key={unidade} style={{ marginLeft: 20, marginBottom: 12 }}>
                          <h4>📂 {unidade}</h4>

                          {Object.entries(subpastas).map(([subpasta, provas]) => (
                            <div key={subpasta} style={{ marginLeft: 20, marginBottom: 12 }}>
                              <h5>📂 {subpasta}</h5>

                              {(provas as any[]).map((item) => {
                                const resultado = corrigir(item.answers || {});
                                const notaBoa = resultado.percentual >= 50;

                                return (
                                  <div key={item.id} style={styles.examBox}>
                                    <strong>📄 {item.exam_name || "Prova sem nome"}</strong>
                                    <p style={{ margin: "6px 0" }}>📚 {item.book_name}</p>
                                    <p style={{ margin: "6px 0" }}>📂 {item.unit_folder}</p>
                                    <p style={{ margin: "6px 0" }}>📂 {item.subfolder_name}</p>
                                    <p style={{ margin: "6px 0" }}>
                                      📅 {new Date(item.created_at).toLocaleString()}
                                    </p>

                                    <p
                                      style={{
                                        margin: "6px 0",
                                        color: notaBoa ? "#166534" : "#dc2626",
                                        fontWeight: 700
                                      }}
                                    >
                                      Nota: {resultado.nota}/{resultado.total} ({resultado.percentual}%)
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
              );
            })}
          </div>
        </section>

        {/* 🚨 EVENTOS */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🚨 Eventos suspeitos</h2>

          <div style={styles.actionsRow}>
            <button onClick={selecionarTodosVisiveis} style={styles.secondaryButton}>
              ☑️ Selecionar visíveis
            </button>
            <button onClick={limparSelecao} style={styles.darkButton}>
              ❎ Limpar seleção
            </button>
            <button onClick={apagarSelecionados} style={styles.deleteButtonTop}>
              🗑️ Apagar selecionados
            </button>
            <button onClick={apagarTodosEventos} style={styles.deleteAllButton}>
              💥 Apagar TODOS os eventos
            </button>
          </div>

          {logsFiltrados.length === 0 && (
            <div style={styles.emptyState}>
              <p>Nenhum evento suspeito encontrado.</p>
            </div>
          )}

          <div style={styles.logsList}>
            {logsFiltrados.map((log) => (
              <div key={log.id} style={styles.logCard}>
                <input
                  type="checkbox"
                  checked={selecionados.includes(log.id)}
                  onChange={() => toggleSelecionado(log.id)}
                />

                <div style={styles.logLeft}>
                  <strong style={styles.logStudent}>
                    {log.student_name || "Sem nome"}
                  </strong>
                  <p style={styles.logEvent}>Evento: {log.evento}</p>
                </div>

                <div style={styles.logRight}>
                  <span style={styles.logDate}>
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
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
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    padding: 24,
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: 1200,
    margin: "0 auto",
  },
  topBar: {
    marginBottom: 24,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
  },
  pageTitle: {
    margin: 0,
    fontSize: 32,
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
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },
  summaryCard: {
    background: "#fff",
    borderRadius: 18,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 10px 25px rgba(0,0,0,0.06)",
  },
  summaryCardDanger: {
    background: "#fff1f2",
    borderRadius: 18,
    padding: 18,
    border: "2px solid #dc2626",
    boxShadow: "0 10px 25px rgba(220,38,38,0.12)",
  },
  summaryNumber: {
    fontSize: 30,
    fontWeight: 800,
    color: "#111827",
  },
  summaryLabel: {
    marginTop: 6,
    color: "#6b7280",
    fontWeight: 600,
  },
  filterBar: {
    display: "flex",
    gap: 16,
    flexWrap: "wrap",
    alignItems: "center",
    background: "#fff",
    padding: 16,
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
    marginBottom: 24,
  },
  filterInput: {
    flex: 1,
    minWidth: 240,
    padding: 12,
    borderRadius: 10,
    border: "1px solid #d1d5db",
    fontSize: 15,
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 600,
    color: "#111827",
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
  deleteButtonTop: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#ef4444",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  deleteAllButton: {
    padding: "12px 16px",
    borderRadius: 12,
    border: "none",
    background: "#7f1d1d",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 700,
  },
  section: {
    marginBottom: 28,
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
  rankCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 14,
    border: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rankCardDanger: {
    background: "#fff1f2",
    borderRadius: 14,
    padding: 14,
    border: "2px solid #dc2626",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  studentHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 10
  },
  alertBadge: {
    background: "#dc2626",
    color: "#fff",
    padding: "8px 12px",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 14
  },
  folderCard: {
    background: "#fff",
    borderRadius: 20,
    padding: 18,
    border: "1px solid #e5e7eb",
    boxShadow: "0 8px 22px rgba(0,0,0,0.05)",
  },
  folderCardDanger: {
    background: "#fff1f2",
    borderRadius: 20,
    padding: 18,
    border: "2px solid #dc2626",
    boxShadow: "0 8px 22px rgba(220,38,38,0.12)",
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
  actionsRow: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 16,
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
    flex: 1,
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

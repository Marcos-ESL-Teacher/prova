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

function agrupar(dados: any[]) {
  const estrutura: any = {};

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

  const [senha, setSenha] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [dados, setDados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);

  async function verificarSenhaProfessor() {
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
      carregar();
    } else {
      setMensagem("Senha incorreta ❌");
    }
  }

  async function carregar() {
    setCarregando(true);

    const { data } = await supabase
      .from("exam_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    setDados(data || []);
    setCarregando(false);
  }

  function sair() {
    setAutorizado(false);
    setSenha("");
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

          <button onClick={verificarSenhaProfessor} style={styles.btn}>
            Entrar
          </button>

          <p>{mensagem}</p>
        </div>
      </div>
    );
  }

  const estrutura = agrupar(dados);

  return (
    <div style={styles.page}>

      <div style={styles.container}>

        <h1 style={{ textAlign: "center" }}>👨‍🏫 Painel do Professor</h1>

        <div style={styles.top}>
          <button onClick={carregar} style={styles.btn}>
            🔄 Atualizar
          </button>
          <button onClick={sair} style={styles.logout}>
            Sair
          </button>
        </div>

        {Object.entries(estrutura).map(([aluno, provas]: any) => (
          <div key={aluno} style={styles.cardAluno}>

            <h2>📁 {aluno}</h2>

            {provas.map((item: any) => {
              const r = corrigir(item.answers);
              const ok = r.percentual >= 50;

              return (
                <div key={item.id} style={styles.cardProva}>

                  <p><b>📄 {item.exam_name}</b></p>
                  <p>📚 {item.book_name}</p>
                  <p>📂 {item.unit_folder}</p>
                  <p>📂 {item.subfolder_name}</p>

                  <p style={{ color: "#64748b" }}>
                    {new Date(item.created_at).toLocaleString()}
                  </p>

                  <p style={{
                    color: ok ? "green" : "red",
                    fontWeight: "bold"
                  }}>
                    Nota: {r.nota}/2 ({r.percentual}%)
                  </p>

                  <pre style={styles.respostas}>
                    {JSON.stringify(item.answers, null, 2)}
                  </pre>

                </div>
              );
            })}

          </div>
        ))}

      </div>
    </div>
  );
}

const styles: any = {

  page: {
    background: "#f8fafc",
    minHeight: "100vh",
    padding: "30px"
  },

  container: {
    maxWidth: "900px",
    margin: "auto"
  },

  top: {
    display: "flex",
    justifyContent: "center",
    gap: "10px",
    marginBottom: "20px"
  },

  cardAluno: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "20px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)"
  },

  cardProva: {
    borderTop: "1px solid #eee",
    paddingTop: "10px",
    marginTop: "10px"
  },

  respostas: {
    background: "#eef2ff",
    padding: "10px",
    borderRadius: "8px"
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
    borderRadius: "10px"
  },

  input: {
    width: "100%",
    padding: "10px",
    marginTop: "10px"
  },

  btn: {
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    cursor: "pointer"
  },

  logout: {
    padding: "10px",
    background: "#111827",
    color: "#fff",
    border: "none",
    cursor: "pointer"
  }

}
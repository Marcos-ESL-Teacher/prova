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
          <h2>🔒 Painel do Professor</h2>

          <input
            type="password"
            placeholder="Senha do professor"
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

  // ✅ PAINEL
  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <h1>👨‍🏫 Painel do Professor</h1>

        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button onClick={carregarProvas} style={styles.button}>
            🔄 Atualizar
          </button>

          <button onClick={sair} style={styles.logout}>
            Sair
          </button>
        </div>

        {carregando && <p>Carregando...</p>}

        {dados.length === 0 && !carregando && (
          <p>Nenhuma prova enviada.</p>
        )}

        <div style={styles.grid}>

          {dados.map((item) => {
            const resultado = corrigir(item.answers || {});
            const aprovado = resultado.percentual >= 50;

            return (
              <div key={item.id} style={styles.card}>

                <h2>📁 {item.student_name}</h2>

                <p><strong>📚 Livro:</strong> {item.book_name}</p>
                <p><strong>📂 Pasta:</strong> {item.unit_folder}</p>
                <p><strong>📂 Subpasta:</strong> {item.subfolder_name}</p>
                <p><strong>📄 Prova:</strong> {item.exam_name}</p>

                <p style={{ color: "#64748b" }}>
                  📅 {new Date(item.created_at).toLocaleString()}
                </p>

                <p style={{
                  fontWeight: "bold",
                  color: aprovado ? "green" : "red"
                }}>
                  Nota: {resultado.nota}/{resultado.total} ({resultado.percentual}%)
                </p>

                <pre style={styles.answers}>
                  {JSON.stringify(item.answers, null, 2)}
                </pre>

              </div>
            );
          })}

        </div>

      </div>
    </div>
  );
}

const styles: any = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "30px"
  },
  container: {
    maxWidth: "900px",
    margin: "auto"
  },
  grid: {
    display: "grid",
    gap: "20px"
  },
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 5px 15px rgba(0,0,0,0.1)"
  },
  answers: {
    background: "#eef2ff",
    padding: "10px",
    borderRadius: "8px"
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
    borderRadius: "10px"
  },
  input: {
    width: "100%",
    padding: "10px",
    marginTop: "10px"
  },
  button: {
    marginTop: "10px",
    padding: "10px",
    background: "#2563eb",
    color: "#fff",
    border: "none"
  },
  logout: {
    padding: "10px",
    background: "#111827",
    color: "#fff",
    border: "none"
  }
};
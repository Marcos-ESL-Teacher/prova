"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {

  const [senha, setSenha] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [dados, setDados] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function verificarSenhaProfessor() {
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
        setAutorizado(true)
        carregarProvas()
      } else {
        setMensagem("Senha incorreta ❌")
      }

    } catch {
      setMensagem("Erro ao validar senha")
    }
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
    setCarregando(false);
  }

  useEffect(() => {
    setCarregando(false)
  }, []);

  // 🔒 BLOQUEIO REAL
  if (!autorizado) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f3f4f6",
        fontFamily: "Arial"
      }}>
        <div style={{
          background: "#fff",
          padding: "30px",
          borderRadius: "15px",
          width: "100%",
          maxWidth: "350px",
          boxShadow: "0 5px 20px rgba(0,0,0,0.1)"
        }}>
          <h2 style={{ textAlign: "center" }}>🔒 Painel do Professor</h2>

          <input
            type="password"
            placeholder="Digite a senha"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ width: "100%", padding: "10px", marginTop: "10px" }}
          />

          <button
            onClick={verificarSenhaProfessor}
            style={{
              marginTop: "15px",
              width: "100%",
              padding: "10px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer"
            }}
          >
            Entrar
          </button>

          <p style={{ marginTop: "10px", textAlign: "center" }}>
            {mensagem}
          </p>
        </div>
      </div>
    )
  }

  // ✅ PAINEL (SÓ APARECE DEPOIS DA SENHA)
  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>Painel do Professor</h1>

      {dados.length === 0 && (
        <p>Nenhuma prova enviada ainda.</p>
      )}

      {dados.map((item) => (
        <div key={item.id} style={{
          border: "1px solid #ccc",
          padding: 10,
          marginTop: 10
        }}>
          <p><strong>Aluno:</strong> {item.student_name}</p>
          <p><strong>Livro:</strong> {item.book_name}</p>
          <p><strong>Pasta:</strong> {item.unit_folder}</p>
          <p><strong>Subpasta:</strong> {item.subfolder_name}</p>
          <p><strong>Prova:</strong> {item.exam_name}</p>
          <p><strong>Data:</strong> {item.created_at}</p>

          <pre style={{
            background: "#f1f5f9",
            padding: 10,
            borderRadius: 8
          }}>
            {JSON.stringify(item.answers, null, 2)}
          </pre>
        </div>
      ))}

    </div>
  );
}
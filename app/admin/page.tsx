"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function AdminPage() {

  const [dados, setDados] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregarTudo() {
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

  // ✅ CORREÇÃO AQUI (sem erro)
  async function carregarLogs() {
    setLogs([]); // desativado por enquanto
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  if (carregando) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Carregando painel...</h2>
      </div>
    );
  }

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
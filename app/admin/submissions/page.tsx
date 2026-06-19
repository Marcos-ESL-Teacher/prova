"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminSubmissionsPage() {
  const [submissions, setSubmissions] = useState<any[]>([]);

  useEffect(() => {
    carregarEnvios();
  }, []);

  async function carregarEnvios() {
    const { data, error } = await supabase
      .from("exam_submissions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setSubmissions(data || []);
  }

  return (
    <div style={styles.page}>
      <h1>👨‍🏫 Provas Recebidas</h1>

      {submissions.length === 0 && (
        <p>Nenhuma prova enviada ainda.</p>
      )}

      {submissions.map((s) => (
        <div key={s.id} style={styles.card}>
          <div>
            <h2>{s.student_name}</h2>

            <p>
              <strong>Status:</strong>{" "}
              {s.correction_status || "pending"}
            </p>

            <p>
              <strong>Data:</strong>{" "}
              {new Date(s.created_at).toLocaleString()}
            </p>

            {s.score !== null && s.score !== undefined && (
              <p>
                <strong>Nota:</strong> {s.score}%
              </p>
            )}

            {s.correct_count !== null &&
              s.correct_count !== undefined && (
                <p>
                  <strong>Acertos:</strong>{" "}
                  {s.correct_count}
                </p>
              )}

            {s.wrong_count !== null &&
              s.wrong_count !== undefined && (
                <p>
                  <strong>Erros:</strong>{" "}
                  {s.wrong_count}
                </p>
              )}
          </div>

          <button
            style={styles.viewButton}
            onClick={() =>
              (window.location.href =
                `/admin/submissions/${s.id}`)
            }
          >
            👁 Ver Prova
          </button>
        </div>
      ))}
    </div>
  );
}

const styles: any = {
  page: {
    padding: "30px",
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "15px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },

  viewButton: {
    padding: "10px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },
};
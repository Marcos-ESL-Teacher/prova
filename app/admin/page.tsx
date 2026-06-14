return (
  <div style={{
    minHeight: "100vh",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    padding: "30px",
    fontFamily: "Arial"
  }}>
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>

      <h1 style={{ textAlign: "center", marginBottom: 20 }}>
        👨‍🏫 Painel do Professor
      </h1>

      <button
        onClick={carregarProvas}
        style={{
          display: "block",
          margin: "0 auto 20px auto",
          padding: "12px 20px",
          background: "#2563eb",
          color: "#fff",
          border: "none",
          borderRadius: "8px",
          fontWeight: "bold",
          cursor: "pointer"
        }}
      >
        🔄 Atualizar
      </button>

      {carregando && (
        <p style={{ textAlign: "center" }}>Carregando provas...</p>
      )}

      {dados.length === 0 && !carregando && (
        <p style={{ textAlign: "center" }}>Nenhuma prova enviada ainda.</p>
      )}

      <div style={{
        display: "grid",
        gap: "20px"
      }}>

        {dados.map((item) => (
          <div key={item.id} style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "16px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)"
          }}>

            <h2 style={{ marginTop: 0 }}>
              📁 {item.student_name}
            </h2>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
              marginTop: "10px"
            }}>
              <p><strong>📚 Livro:</strong> {item.book_name}</p>
              <p><strong>📂 Pasta:</strong> {item.unit_folder}</p>
              <p><strong>📂 Subpasta:</strong> {item.subfolder_name}</p>
              <p><strong>📄 Prova:</strong> {item.exam_name}</p>
            </div>

            <p style={{ marginTop: "10px", color: "#64748b" }}>
              📅 {new Date(item.created_at).toLocaleString()}
            </p>

            <div style={{
              marginTop: "15px",
              background: "#eef2ff",
              padding: "12px",
              borderRadius: "10px"
            }}>
              <pre style={{ margin: 0 }}>
                {JSON.stringify(item.answers, null, 2)}
              </pre>
            </div>

          </div>
        ))}

      </div>

    </div>
  </div>
)
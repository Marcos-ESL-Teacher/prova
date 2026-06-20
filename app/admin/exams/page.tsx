"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function ExamsAdminPage() {
  const [colecoes, setColecoes] = useState<any[]>([]);
  const [livros, setLivros] = useState<any[]>([]);
  const [pastas, setPastas] = useState<any[]>([]);
  const [slots, setSlots] = useState<any[]>([]);
  const [provas, setProvas] = useState<any[]>([]);

  const [colecaoSelecionada, setColecaoSelecionada] = useState<any>(null);
  const [livroSelecionado, setLivroSelecionado] = useState<any>(null);
  const [pastaSelecionada, setPastaSelecionada] = useState<any>(null);
  const [slotSelecionado, setSlotSelecionado] = useState<any>(null);

  const [novaProva, setNovaProva] = useState("");
  const [descricao, setDescricao] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarColecoes();
  }, []);

  async function carregarColecoes() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("book_collections")
      .select("*")
      .order("sort_order", { ascending: true });

    setCarregando(false);

    if (error) return alert(error.message);
    setColecoes(data || []);
  }

  async function abrirColecao(colecao: any) {
    setColecaoSelecionada(colecao);
    setLivroSelecionado(null);
    setPastaSelecionada(null);
    setSlotSelecionado(null);
    setLivros([]);
    setPastas([]);
    setSlots([]);
    setProvas([]);

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("collection_id", colecao.id)
      .order("sort_order", { ascending: true });

    if (error) return alert(error.message);
    setLivros(data || []);
  }

  async function abrirLivro(livro: any) {
    setLivroSelecionado(livro);
    setPastaSelecionada(null);
    setSlotSelecionado(null);
    setPastas([]);
    setSlots([]);
    setProvas([]);

    const { data, error } = await supabase
      .from("book_folders")
      .select("*")
      .eq("book_id", livro.id)
      .order("sort_order", { ascending: true });

    if (error) return alert(error.message);
    setPastas(data || []);
  }

  async function abrirPasta(pasta: any) {
    setPastaSelecionada(pasta);
    setSlotSelecionado(null);
    setSlots([]);
    setProvas([]);

    const { data, error } = await supabase
      .from("exam_slots")
      .select("*")
      .eq("folder_id", pasta.id)
      .order("sort_order", { ascending: true });

    if (error) return alert(error.message);
    setSlots(data || []);
  }

  async function abrirSlot(slot: any) {
    setSlotSelecionado(slot);
    setProvas([]);

    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("slot_id", slot.id)
      .order("sort_order", { ascending: true });

    if (error) return alert(error.message);
    setProvas(data || []);
  }

  async function adicionarSlot() {
    if (!pastaSelecionada) {
      alert("Selecione uma pasta primeiro.");
      return;
    }

    const nome = prompt("Nome do novo slot:", `Slot ${slots.length + 1}`);
    if (!nome || !nome.trim()) return;

    const proximaOrdem =
      slots.length > 0
        ? Math.max(...slots.map((slot) => Number(slot.sort_order || 0))) + 1
        : 1;

    const { error } = await supabase.from("exam_slots").insert([
      {
        folder_id: pastaSelecionada.id,
        name: nome.trim(),
        sort_order: proximaOrdem,
      },
    ]);

    if (error) {
      alert("Erro ao adicionar slot: " + error.message);
      return;
    }

    await abrirPasta(pastaSelecionada);
  }

  async function renomearSlot(slot: any) {
    const novoNome = prompt("Novo nome do slot:", slot.name);
    if (!novoNome || !novoNome.trim()) return;

    const { error } = await supabase
      .from("exam_slots")
      .update({ name: novoNome.trim() })
      .eq("id", slot.id);

    if (error) {
      alert("Erro ao renomear slot: " + error.message);
      return;
    }

    await abrirPasta(pastaSelecionada);
  }

  async function excluirSlot(slot: any) {
    const confirmar = confirm(
      `Tem certeza que deseja excluir o slot "${slot.name}"?\n\nAtenção: se houver provas dentro dele, o Supabase pode impedir a exclusão.`
    );

    if (!confirmar) return;

    const { error } = await supabase.from("exam_slots").delete().eq("id", slot.id);

    if (error) {
      alert("Erro ao excluir slot: " + error.message);
      return;
    }

    setSlotSelecionado(null);
    setProvas([]);
    await abrirPasta(pastaSelecionada);
  }

  async function adicionarProva() {
    if (!slotSelecionado) return alert("Selecione um slot primeiro.");
    if (!novaProva.trim()) return alert("Digite o nome da prova.");

    const proximaOrdem =
      provas.length > 0
        ? Math.max(...provas.map((prova) => Number(prova.sort_order || 0))) + 1
        : 1;

    const { error } = await supabase.from("exams").insert([
      {
        slot_id: slotSelecionado.id,
        title: novaProva.trim(),
        description: descricao.trim(),
        sort_order: proximaOrdem,
        is_active: true,
      },
    ]);

    if (error) return alert(error.message);

    setNovaProva("");
    setDescricao("");
    await abrirSlot(slotSelecionado);
  }

  async function excluirProva(id: string) {
    const confirmar = confirm("Tem certeza que deseja excluir esta prova?");
    if (!confirmar) return;

    const { error } = await supabase.from("exams").delete().eq("id", id);

    if (error) return alert(error.message);
    await abrirSlot(slotSelecionado);
  }

  async function renomearProva(prova: any) {
    const novoNome = prompt("Novo nome da prova:", prova.title);
    if (!novoNome || !novoNome.trim()) return;

    const novaDescricao = prompt(
      "Nova descrição da prova:",
      prova.description || ""
    );

    const { error } = await supabase
      .from("exams")
      .update({
        title: novoNome.trim(),
        description: novaDescricao || "",
      })
      .eq("id", prova.id);

    if (error) return alert(error.message);
    await abrirSlot(slotSelecionado);
  }

  function itemStyle(ativo: boolean) {
    return {
      ...styles.item,
      ...(ativo ? styles.itemActive : {}),
    };
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <div>
          <h1 style={styles.title}>📚 Gerenciar Provas</h1>
          <p style={styles.subtitle}>
            Coleções → Livros → Pastas → Slots → Provas
          </p>
        </div>

        <button onClick={carregarColecoes} style={styles.refreshButton}>
          🔄 Atualizar
        </button>
      </div>

      {carregando && <div style={styles.notice}>Carregando...</div>}

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Coleções</h2>

          {colecoes.length === 0 && (
            <p style={styles.empty}>Nenhuma coleção encontrada.</p>
          )}

          {colecoes.map((c) => (
            <button
              key={c.id}
              style={itemStyle(colecaoSelecionada?.id === c.id)}
              onClick={() => abrirColecao(c)}
            >
              📚 {c.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Livros</h2>

          {!colecaoSelecionada && (
            <p style={styles.empty}>Selecione uma coleção.</p>
          )}

          {colecaoSelecionada && livros.length === 0 && (
            <p style={styles.empty}>Nenhum livro encontrado.</p>
          )}

          {livros.map((l) => (
            <button
              key={l.id}
              style={itemStyle(livroSelecionado?.id === l.id)}
              onClick={() => abrirLivro(l)}
            >
              📘 {l.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Pastas</h2>

          {!livroSelecionado && <p style={styles.empty}>Selecione um livro.</p>}

          {livroSelecionado && pastas.length === 0 && (
            <p style={styles.empty}>Nenhuma pasta encontrada.</p>
          )}

          {pastas.map((p) => (
            <button
              key={p.id}
              style={itemStyle(pastaSelecionada?.id === p.id)}
              onClick={() => abrirPasta(p)}
            >
              📁 {p.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <div style={styles.cardHeader}>
            <h2 style={styles.cardTitle}>Slots</h2>

            {pastaSelecionada && (
              <button onClick={adicionarSlot} style={styles.smallAddButton}>
                ➕ Slot
              </button>
            )}
          </div>

          {!pastaSelecionada && (
            <p style={styles.empty}>Selecione uma pasta.</p>
          )}

          {pastaSelecionada && (
            <div style={styles.selectedBox}>
              Pasta selecionada: <strong>{pastaSelecionada.name}</strong>
            </div>
          )}

          {pastaSelecionada && slots.length === 0 && (
            <div style={styles.emptyActionBox}>
              <p style={styles.empty}>Nenhum slot cadastrado nesta pasta.</p>
              <button onClick={adicionarSlot} style={styles.addButtonFull}>
                ➕ Adicionar primeiro slot
              </button>
            </div>
          )}

          {slots.map((s) => (
            <div key={s.id} style={styles.slotRow}>
              <button
                style={itemStyle(slotSelecionado?.id === s.id)}
                onClick={() => abrirSlot(s)}
              >
                🧩 {s.name}
              </button>

              <div style={styles.slotActions}>
                <button
                  onClick={() => renomearSlot(s)}
                  style={styles.iconButton}
                  title="Renomear slot"
                >
                  ✏️
                </button>

                <button
                  onClick={() => excluirSlot(s)}
                  style={styles.iconDeleteButton}
                  title="Excluir slot"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>

      {slotSelecionado && (
        <section style={styles.provasCard}>
          <div style={styles.provasHeader}>
            <div>
              <h2 style={styles.cardTitle}>📄 Provas em: {slotSelecionado.name}</h2>
              <p style={styles.subtitle}>
                Pasta: {pastaSelecionada?.name || "Não informada"}
              </p>
            </div>
          </div>

          <input
            placeholder="Nome da prova"
            value={novaProva}
            onChange={(e) => setNovaProva(e.target.value)}
            style={styles.input}
          />

          <textarea
            placeholder="Descrição da prova"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            style={styles.textarea}
          />

          <button onClick={adicionarProva} style={styles.addButton}>
            ➕ Adicionar Prova
          </button>

          <div style={styles.listaProvas}>
            {provas.length === 0 && (
              <p style={styles.empty}>Nenhuma prova cadastrada neste slot.</p>
            )}

            {provas.map((p) => (
              <div key={p.id} style={styles.provaItem}>
                <div style={styles.provaInfo}>
                  <strong>{p.title}</strong>
                  {p.description && <p>{p.description}</p>}
                  <small>ID: {p.id}</small>
                </div>

                <div style={styles.provaActions}>
                  <button
                    onClick={() => {
                      window.location.href = `/admin/exams/${p.id}`;
                    }}
                    style={styles.openButton}
                  >
                    📝 Questões
                  </button>

                  <button
                    onClick={() => {
                      window.location.href = `/admin/import-pdf?examId=${p.id}`;
                    }}
                    style={styles.importButton}
                  >
                    📥 Importar PDF
                  </button>

                  <button
                    onClick={() => {
                      alert("Função preparada para o futuro: aqui entraremos com IA para melhorar o OCR e organizar os blocos automaticamente.");
                    }}
                    style={styles.aiButton}
                  >
                    🧠 IA Futuro
                  </button>

                  <button
                    onClick={() => {
                      window.location.href = `/student/exam-blocks/${p.id}`;
                    }}
                    style={styles.studentButton}
                  >
                    👨‍🎓 Link Aluno
                  </button>

                  <button onClick={() => renomearProva(p)} style={styles.editButton}>
                    ✏️ Editar
                  </button>

                  <button
                    onClick={() => excluirProva(p.id)}
                    style={styles.deleteButton}
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const styles: any = {
  page: {
    padding: "30px",
    fontFamily: "Arial, sans-serif",
    background: "#f8fafc",
    minHeight: "100vh",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    marginBottom: "18px",
  },

  title: {
    margin: 0,
    color: "#111827",
  },

  subtitle: {
    margin: "6px 0 0",
    color: "#64748b",
    fontSize: "14px",
  },

  notice: {
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    padding: "12px",
    borderRadius: "10px",
    marginBottom: "16px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(230px, 1fr))",
    gap: "16px",
    alignItems: "start",
  },

  card: {
    background: "#fff",
    padding: "18px",
    borderRadius: "14px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
    minHeight: "230px",
  },

  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "10px",
    marginBottom: "10px",
  },

  cardTitle: {
    margin: "0 0 12px",
    color: "#111827",
    fontSize: "20px",
  },

  item: {
    display: "block",
    width: "100%",
    marginBottom: "8px",
    padding: "11px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    background: "#f9fafb",
    cursor: "pointer",
    textAlign: "left",
    color: "#111827",
  },

  itemActive: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
    fontWeight: "bold",
  },

  empty: {
    color: "#64748b",
    fontSize: "14px",
  },

  selectedBox: {
    background: "#f1f5f9",
    padding: "10px",
    borderRadius: "8px",
    marginBottom: "10px",
    color: "#334155",
    fontSize: "14px",
  },

  emptyActionBox: {
    border: "1px dashed #cbd5e1",
    borderRadius: "10px",
    padding: "14px",
    background: "#f8fafc",
  },

  refreshButton: {
    padding: "11px 14px",
    background: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  smallAddButton: {
    padding: "8px 10px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
    whiteSpace: "nowrap",
  },

  addButtonFull: {
    width: "100%",
    padding: "11px",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  slotRow: {
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: "8px",
    alignItems: "start",
  },

  slotActions: {
    display: "flex",
    gap: "5px",
    paddingTop: "1px",
  },

  iconButton: {
    padding: "9px",
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  iconDeleteButton: {
    padding: "9px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  provasCard: {
    marginTop: "24px",
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },

  provasHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center",
    marginBottom: "12px",
  },

  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
  },

  textarea: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #ccc",
    minHeight: "80px",
  },

  addButton: {
    padding: "12px 16px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "bold",
  },

  listaProvas: {
    marginTop: "18px",
  },

  provaItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    marginBottom: "10px",
    background: "#f9fafb",
  },

  provaInfo: {
    minWidth: 0,
  },

  provaActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "flex-end",
  },

  openButton: {
    padding: "8px 10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  importButton: {
    padding: "8px 10px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  aiButton: {
    padding: "8px 10px",
    background: "#9333ea",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  studentButton: {
    padding: "8px 10px",
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  editButton: {
    padding: "8px 10px",
    background: "#f59e0b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },

  deleteButton: {
    padding: "8px 10px",
    background: "#dc2626",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
};

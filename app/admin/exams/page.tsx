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

  useEffect(() => {
    carregarColecoes();
  }, []);

  function getStudentLink(provaId: string) {
    return `${window.location.origin}/student/exam/${provaId}`;
  }

  async function copiarLink(prova: any) {
    const link = getStudentLink(prova.id);

    try {
      await navigator.clipboard.writeText(link);
      alert("Link da prova copiado:\n\n" + link);
    } catch {
      prompt("Copie o link da prova:", link);
    }
  }

  function enviarWhatsApp(prova: any) {
    const link = getStudentLink(prova.id);

    const mensagem = `Olá!

Por favor, responda sua prova pelo link abaixo:

${link}

Boa sorte!`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsappUrl, "_blank");
  }

  async function carregarColecoes() {
    const { data, error } = await supabase
      .from("book_collections")
      .select("*")
      .order("sort_order");

    if (error) return alert(error.message);
    setColecoes(data || []);
  }

  async function abrirColecao(colecao: any) {
    setColecaoSelecionada(colecao);
    setLivroSelecionado(null);
    setPastaSelecionada(null);
    setSlotSelecionado(null);
    setPastas([]);
    setSlots([]);
    setProvas([]);

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("collection_id", colecao.id)
      .order("sort_order");

    if (error) return alert(error.message);
    setLivros(data || []);
  }

  async function abrirLivro(livro: any) {
    setLivroSelecionado(livro);
    setPastaSelecionada(null);
    setSlotSelecionado(null);
    setSlots([]);
    setProvas([]);

    const { data, error } = await supabase
      .from("book_folders")
      .select("*")
      .eq("book_id", livro.id)
      .order("sort_order");

    if (error) return alert(error.message);
    setPastas(data || []);
  }

  async function abrirPasta(pasta: any) {
    setPastaSelecionada(pasta);
    setSlotSelecionado(null);
    setProvas([]);

    const { data, error } = await supabase
      .from("exam_slots")
      .select("*")
      .eq("folder_id", pasta.id)
      .order("sort_order");

    if (error) return alert(error.message);
    setSlots(data || []);
  }

  async function abrirSlot(slot: any) {
    setSlotSelecionado(slot);

    const { data, error } = await supabase
      .from("exams")
      .select("*")
      .eq("slot_id", slot.id)
      .order("sort_order");

    if (error) return alert(error.message);
    setProvas(data || []);
  }

  async function adicionarProva() {
    if (!slotSelecionado) return alert("Selecione um slot primeiro.");
    if (!novaProva.trim()) return alert("Digite o nome da prova.");

    const { error } = await supabase.from("exams").insert([
      {
        slot_id: slotSelecionado.id,
        title: novaProva,
        description: descricao,
        is_active: true,
      },
    ]);

    if (error) return alert(error.message);

    setNovaProva("");
    setDescricao("");
    abrirSlot(slotSelecionado);
  }

  async function excluirProva(id: string) {
    const confirmar = confirm("Tem certeza que deseja excluir esta prova?");
    if (!confirmar) return;

    const { error } = await supabase.from("exams").delete().eq("id", id);

    if (error) return alert(error.message);
    abrirSlot(slotSelecionado);
  }

  async function renomearProva(prova: any) {
    const novoNome = prompt("Novo nome da prova:", prova.title);
    if (!novoNome) return;

    const { error } = await supabase
      .from("exams")
      .update({ title: novoNome })
      .eq("id", prova.id);

    if (error) return alert(error.message);
    abrirSlot(slotSelecionado);
  }

  return (
    <div style={styles.page}>
      <h1>📚 Gerenciar Provas</h1>

      <div style={styles.grid}>
        <section style={styles.card}>
          <h2>Coleções</h2>
          {colecoes.map((c) => (
            <button key={c.id} style={styles.item} onClick={() => abrirColecao(c)}>
              📚 {c.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <h2>Livros</h2>
          {livros.map((l) => (
            <button key={l.id} style={styles.item} onClick={() => abrirLivro(l)}>
              📘 {l.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <h2>Pastas</h2>
          {pastas.map((p) => (
            <button key={p.id} style={styles.item} onClick={() => abrirPasta(p)}>
              📁 {p.name}
            </button>
          ))}
        </section>

        <section style={styles.card}>
          <h2>Slots</h2>
          {slots.map((s) => (
            <button key={s.id} style={styles.item} onClick={() => abrirSlot(s)}>
              🧩 {s.name}
            </button>
          ))}
        </section>
      </div>

      {slotSelecionado && (
        <section style={styles.provasCard}>
          <h2>📄 Provas em: {slotSelecionado.name}</h2>

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
            {provas.map((p) => (
              <div key={p.id} style={styles.provaItem}>
                <div>
                  <strong>{p.title}</strong>
                  <p>{p.description}</p>
                  <small style={styles.linkPreview}>
                    Link do aluno: {getStudentLink(p.id)}
                  </small>
                </div>

                <div style={styles.actions}>
                  <button
                    onClick={() => (window.location.href = `/admin/exams/${p.id}`)}
                    style={styles.openButton}
                  >
                    📝 Questões
                  </button>

                  <button onClick={() => copiarLink(p)} style={styles.copyButton}>
                    🔗 Copiar Link
                  </button>

                  <button onClick={() => enviarWhatsApp(p)} style={styles.whatsappButton}>
                    📲 WhatsApp
                  </button>

                  <button onClick={() => renomearProva(p)} style={styles.editButton}>
                    ✏️ Editar
                  </button>

                  <button onClick={() => excluirProva(p.id)} style={styles.deleteButton}>
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
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "#fff",
    padding: "18px",
    borderRadius: "14px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
  },
  item: {
    display: "block",
    width: "100%",
    marginBottom: "8px",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    background: "#f9fafb",
    cursor: "pointer",
    textAlign: "left",
  },
  provasCard: {
    marginTop: "24px",
    background: "#fff",
    padding: "20px",
    borderRadius: "14px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
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
    alignItems: "center",
    gap: "12px",
    padding: "14px",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    marginBottom: "10px",
    background: "#f9fafb",
  },
  actions: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "flex-end",
  },
  linkPreview: {
    display: "block",
    marginTop: "8px",
    color: "#475569",
    wordBreak: "break-all",
  },
  openButton: {
    padding: "8px 10px",
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  copyButton: {
    padding: "8px 10px",
    background: "#0f766e",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
  },
  whatsappButton: {
    padding: "8px 10px",
    background: "#16a34a",
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
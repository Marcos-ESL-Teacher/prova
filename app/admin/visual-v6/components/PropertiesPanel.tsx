"use client";

import type { CSSProperties } from "react";

export type EditableField = {
  id: string;
  questionNumber: number;
  fieldType: string;
  answerValue: string;
  points: number;
  required: boolean;
};

type PropertiesPanelProps = {
  field: EditableField | null;
  onChange: (updates: Partial<EditableField>) => void;
};

export default function PropertiesPanel({
  field,
  onChange,
}: PropertiesPanelProps) {
  if (!field) {
    return (
      <aside style={styles.panel}>
        <h2 style={styles.title}>Propriedades</h2>
        <p style={styles.emptyText}>
          Selecione um campo sobre o PDF para editar suas propriedades.
        </p>
      </aside>
    );
  }

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <div>
          <span style={styles.labelSmall}>Campo selecionado</span>
          <h2 style={styles.title}>Q{field.questionNumber}</h2>
        </div>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Número da questão</label>
        <input
          type="number"
          min={1}
          value={field.questionNumber}
          onChange={(event) =>
            onChange({
              questionNumber: Math.max(1, Number(event.target.value) || 1),
            })
          }
          style={styles.input}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Tipo do campo</label>
        <select
          value={field.fieldType}
          onChange={(event) => onChange({ fieldType: event.target.value })}
          style={styles.input}
        >
          <option value="short_text">Texto curto</option>
          <option value="long_text">Texto longo</option>
          <option value="multiple_choice">Alternativa / X</option>
          <option value="number">Número</option>
          <option value="date">Data</option>
        </select>
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Resposta correta</label>
        <textarea
          value={field.answerValue}
          onChange={(event) => onChange({ answerValue: event.target.value })}
          placeholder="Digite a resposta correta"
          rows={4}
          style={{ ...styles.input, ...styles.textarea }}
        />
      </div>

      <div style={styles.formGroup}>
        <label style={styles.label}>Pontos</label>
        <input
          type="number"
          min={0}
          step="0.25"
          value={field.points}
          onChange={(event) =>
            onChange({
              points: Math.max(0, Number(event.target.value) || 0),
            })
          }
          style={styles.input}
        />
      </div>

      <label style={styles.checkboxRow}>
        <input
          type="checkbox"
          checked={field.required}
          onChange={(event) => onChange({ required: event.target.checked })}
        />
        <span>Campo obrigatório</span>
      </label>

      <div style={styles.infoBox}>
        As alterações ficam na tela imediatamente. Clique em{" "}
        <strong>Salvar campos</strong> para gravar no Supabase.
      </div>
    </aside>
  );
}

const styles: Record<string, CSSProperties> = {
  panel: {
    width: "320px",
    minWidth: "320px",
    padding: "18px",
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "14px",
    alignSelf: "flex-start",
    position: "sticky",
    top: "16px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },
  labelSmall: {
    display: "block",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  title: {
    margin: "4px 0 0",
    fontSize: "22px",
  },
  emptyText: {
    margin: 0,
    color: "#64748b",
    lineHeight: 1.6,
  },
  formGroup: {
    marginBottom: "14px",
  },
  label: {
    display: "block",
    marginBottom: "6px",
    color: "#334155",
    fontSize: "13px",
    fontWeight: 800,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 11px",
    border: "1px solid #94a3b8",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#0f172a",
  },
  textarea: {
    resize: "vertical",
    minHeight: "96px",
    fontFamily: "inherit",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
    color: "#334155",
    fontWeight: 700,
    cursor: "pointer",
  },
  infoBox: {
    padding: "11px 12px",
    background: "#eff6ff",
    border: "1px solid #93c5fd",
    borderRadius: "10px",
    color: "#1e40af",
    fontSize: "13px",
    lineHeight: 1.5,
  },
};
"use client";

import type { CSSProperties, PointerEvent } from "react";
import type { FieldBoxData } from "./FieldLayer";

type Props = {
  field: FieldBoxData;
  selected: boolean;
  dragging: boolean;
  resizing: boolean;
  resizeEnabled: boolean;
  onSelect: (fieldId: string) => void;
  onPointerDown: (
    fieldId: string,
    event: PointerEvent<HTMLDivElement>
  ) => void;
  onResizePointerDown: (
    fieldId: string,
    event: PointerEvent<HTMLDivElement>
  ) => void;
};

export default function FieldBox({
  field,
  selected,
  dragging,
  resizing,
  resizeEnabled,
  onSelect,
  onPointerDown,
  onResizePointerDown,
}: Props) {
  const typeLabel =
    field.fieldType === "choice"
      ? `⭕ ${field.answerValue || "?"}`
      : field.fieldType === "circle_word"
        ? `🔵 ${field.answerValue || "Palavra"}`
        : field.fieldType === "checkbox"
          ? `☑ ${field.answerValue || "?"}`
          : `Q${field.questionNumber}`;

  return (
    <div
      data-vee-field="true"
      data-field-id={field.id}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onSelect(field.id);
      }}
      onPointerDown={(event) => onPointerDown(field.id, event)}
      style={{
        ...styles.box,
        ...(selected ? styles.selected : {}),
        left: `${field.xPercent}%`,
        top: `${field.yPercent}%`,
        width: `${field.widthPercent}%`,
        height: `${field.heightPercent}%`,
        cursor: dragging
          ? "grabbing"
          : resizing
            ? "nwse-resize"
            : "grab",
      }}
      title={`Q${field.questionNumber} — ${field.fieldType}${
        field.isCorrect ? " — correta" : ""
      }`}
    >
      {typeLabel}

      {selected && resizeEnabled && (
        <div
          data-vee-resize-handle="true"
          aria-label="Redimensionar campo"
          title="Arraste para aumentar ou diminuir"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizePointerDown(field.id, event);
          }}
          style={styles.resizeHandle}
        />
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  box: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    border: "2px solid #2563eb",
    background: "rgba(37,99,235,.14)",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
    borderRadius: "4px",
    userSelect: "none",
    touchAction: "none",
    boxSizing: "border-box",
  },
  selected: {
    border: "3px solid #1d4ed8",
    background: "rgba(37,99,235,.24)",
    boxShadow: "0 0 0 3px rgba(37,99,235,.25)",
    zIndex: 10,
  },
  resizeHandle: {
    position: "absolute",
    width: "14px",
    height: "14px",
    right: "-8px",
    bottom: "-8px",
    borderRadius: "3px",
    border: "2px solid #ffffff",
    background: "#1d4ed8",
    boxShadow: "0 1px 4px rgba(15,23,42,.35)",
    cursor: "nwse-resize",
    touchAction: "none",
    zIndex: 20,
  },
};
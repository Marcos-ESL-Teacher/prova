"use client";

import type { CSSProperties, PointerEvent } from "react";
import type { FieldBoxData } from "./FieldLayer";

type Props = {
  field: FieldBoxData;
  selected: boolean;
  dragging: boolean;
  onSelect: (fieldId: string) => void;
  onPointerDown: (
    fieldId: string,
    event: PointerEvent<HTMLDivElement>
  ) => void;
};

export default function FieldBox({
  field,
  selected,
  dragging,
  onSelect,
  onPointerDown,
}: Props) {
  const typeLabel =
    field.fieldType === "choice"
      ? `⭕ ${field.answerValue || "?"}`
      : field.fieldType === "checkbox"
        ? `☑ ${field.answerValue || "?"}`
        : `Q${field.questionNumber}`;

  return (
    <div
      data-vee-field="true"
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
        cursor: dragging ? "grabbing" : "grab",
      }}
      title={`Q${field.questionNumber} — ${field.fieldType}${
        field.isCorrect ? " — correta" : ""
      }`}
    >
      {typeLabel}
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
};

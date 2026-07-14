"use client";

import type { CSSProperties, MouseEvent } from "react";
import type { FieldBoxData } from "./FieldLayer";

type FieldBoxProps = {
  field: FieldBoxData;
  selected: boolean;
  onSelect: (fieldId: string) => void;
  onDragStart: (
    fieldId: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
};

export default function FieldBox({
  field,
  selected,
  onSelect,
  onDragStart,
}: FieldBoxProps) {
  function handleClick(event: MouseEvent<HTMLDivElement>) {
    event.stopPropagation();
    onSelect(field.id);
  }

  return (
<div
  onClick={handleClick}
  onMouseDown={(e) => onDragStart(field.id, e)}
      style={{
        ...styles.fieldBox,
        ...(selected ? styles.selectedFieldBox : {}),
        left: `${field.xPercent}%`,
        top: `${field.yPercent}%`,
        width: `${field.widthPercent}%`,
        height: `${field.heightPercent}%`,
      }}
      title={`Q${field.questionNumber}`}
    >
      Q{field.questionNumber}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  fieldBox: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    border: "2px solid #2563eb",
    background: "rgba(37, 99, 235, 0.12)",
    color: "#1d4ed8",
    fontSize: "12px",
    fontWeight: 800,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "auto",
    borderRadius: "4px",
    cursor: "pointer",
    userSelect: "none",
  },
  selectedFieldBox: {
    border: "3px solid #1d4ed8",
    background: "rgba(37, 99, 235, 0.24)",
    boxShadow: "0 0 0 3px rgba(37, 99, 235, 0.25)",
    zIndex: 10,
  },
};
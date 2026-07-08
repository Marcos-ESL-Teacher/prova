"use client";

import type { CSSProperties } from "react";
import type { FieldBoxData } from "./FieldLayer";

type FieldBoxProps = {
  field: FieldBoxData;
};

export default function FieldBox({ field }: FieldBoxProps) {
  return (
    <div
      style={{
        ...styles.fieldBox,
        left: `${field.xPercent}%`,
        top: `${field.yPercent}%`,
        width: `${field.widthPercent}%`,
        height: `${field.heightPercent}%`,
      }}
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
    pointerEvents: "none",
    borderRadius: "4px",
  },
};
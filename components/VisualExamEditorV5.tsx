"use client";

import { useState } from "react";

export default function VisualExamEditorV5() {
  const [fields, setFields] = useState<any[]>([]);

  function handleClick(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - rect.left) / rect.width) * 100;

    const y =
      ((event.clientY - rect.top) / rect.height) * 100;

    setFields((prev) => [
      ...prev,
      {
        x,
        y,
      },
    ]);
  }

  return (
    <div
      onClick={handleClick}
      style={{
        position: "relative",
        width: "900px",
        margin: "20px auto",
        cursor: "crosshair",
      }}
    >
      <img
        src="https://picsum.photos/900/1200"
        alt="Página de teste"
        style={{
          width: "900px",
          display: "block",
          border: "1px solid #ccc",
        }}
      />

      {fields.map((field, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            left: `${field.x}%`,
            top: `${field.y}%`,
            width: "60px",
            height: "30px",
            background: "rgba(255,0,0,0.4)",
            border: "2px solid red",
            transform: "translate(-50%, -50%)",
          }}
        >
          Q{index + 1}
        </div>
      ))}
    </div>
  );
}
"use client";

import { useState } from "react";

export default function VisualExamEditorV5() {
  const [fields, setFields] = useState<any[]>([]);
  const [imageUrl, setImageUrl] = useState("");

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

  function handleImageUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    const url = URL.createObjectURL(file);

    setImageUrl(url);
  }

  return (
    <div>
      <div
        style={{
          marginBottom: "20px",
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
        />
      </div>

      <div
        onClick={handleClick}
        style={{
          position: "relative",
          width: "900px",
          margin: "20px auto",
          cursor: "crosshair",
        }}
      >

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
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
              color: "#000",
            }}
          >
            Q{index + 1}
          </div>
        ))}
      </div>
    </div>
  );
}
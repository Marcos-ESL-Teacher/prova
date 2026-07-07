"use client";

import VisualExamEditorV5 from "../../../components/VisualExamEditorV5";

export default function VisualV5Page() {
  return (
    <div
      style={{
        padding: "24px",
        background: "#f1f5f9",
        minHeight: "100vh",
      }}
    >
      <h1>Visual Exam Editor V5</h1>

      <VisualExamEditorV5 />
    </div>
  );
}
"use client";

import VisualExamEditorV5 from "../../components/VisualExamEditorV5";

export default function TesteVisualPage() {
  return (
    <div
      style={{
        padding: "30px",
        minHeight: "100vh",
        background: "#f1f5f9",
      }}
    >
      <h1>Visual Exam Editor V5</h1>

      <VisualExamEditorV5 />
    </div>
  );
}
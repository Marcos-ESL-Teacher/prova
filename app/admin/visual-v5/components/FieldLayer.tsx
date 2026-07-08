"use client";

import type { CSSProperties } from "react";
import FieldBox from "./FieldBox";

export type FieldBoxData = {
  id: string;
  dbId?: string;
  page: number;
  questionNumber: number;
  fieldType: string;
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

type FieldLayerProps = {
  fields: FieldBoxData[];
};

export default function FieldLayer({ fields }: FieldLayerProps) {
  return (
    <div style={styles.layer}>
      {fields.map((field) => (
        <FieldBox key={field.id} field={field} />
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  layer: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
  },
};
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
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;

  onDragStart: (
    fieldId: string,
    event: React.MouseEvent<HTMLDivElement>
  ) => void;
};

export default function FieldLayer({
  fields,
  selectedFieldId,
  onSelectField,
  onDragStart,
}: FieldLayerProps) {
  return (
    <div style={styles.layer}>
      {fields.map((field) => (
<FieldBox
  key={field.id}
  field={field}
  selected={field.id === selectedFieldId}
  onSelect={onSelectField}
  onDragStart={onDragStart}
/>
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
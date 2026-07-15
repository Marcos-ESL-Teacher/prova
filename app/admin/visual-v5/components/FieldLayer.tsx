"use client";

import type { CSSProperties, PointerEvent } from "react";
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

type Props = {
  fields: FieldBoxData[];
  selectedFieldId: string | null;
  draggingFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onFieldPointerDown: (
    fieldId: string,
    event: PointerEvent<HTMLDivElement>
  ) => void;
};

export default function FieldLayer({
  fields,
  selectedFieldId,
  draggingFieldId,
  onSelectField,
  onFieldPointerDown,
}: Props) {
  return (
    <div style={styles.layer}>
      {fields.map((field) => (
        <FieldBox
          key={field.id}
          field={field}
          selected={field.id === selectedFieldId}
          dragging={field.id === draggingFieldId}
          onSelect={onSelectField}
          onPointerDown={onFieldPointerDown}
        />
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  layer: { position: "absolute", inset: 0, pointerEvents: "none" },
};

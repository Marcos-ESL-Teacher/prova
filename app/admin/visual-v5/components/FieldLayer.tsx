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
  answerValue?: string;
  isCorrect?: boolean;
};

type Props = {
  fields: FieldBoxData[];
  selectedFieldId: string | null;
  draggingFieldId: string | null;
  resizingFieldId: string | null;
  resizeEnabled: boolean;
  onSelectField: (fieldId: string) => void;
  onFieldPointerDown: (
    fieldId: string,
    event: PointerEvent<HTMLDivElement>
  ) => void;
  onResizePointerDown: (
    fieldId: string,
    event: PointerEvent<HTMLDivElement>
  ) => void;
};

export default function FieldLayer({
  fields,
  selectedFieldId,
  draggingFieldId,
  resizingFieldId,
  resizeEnabled,
  onSelectField,
  onFieldPointerDown,
  onResizePointerDown,
}: Props) {
  return (
    <div style={styles.layer}>
      {fields.map((field) => (
        <FieldBox
          key={field.id}
          field={field}
          selected={field.id === selectedFieldId}
          dragging={field.id === draggingFieldId}
          resizing={field.id === resizingFieldId}
          resizeEnabled={resizeEnabled}
          onSelect={onSelectField}
          onPointerDown={onFieldPointerDown}
          onResizePointerDown={onResizePointerDown}
        />
      ))}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  layer: { position: "absolute", inset: 0, pointerEvents: "none" },
};

export type VeeProjectStatus =
  | "draft"
  | "uploading"
  | "ready"
  | "published"
  | "archived";

export type VeeFieldType =
  | "choice"
  | "fill_blank"
  | "short_text"
  | "essay"
  | "circle_option";

export type VeeProject = {
  id: string;
  exam_id: string;
  pdf_path: string | null;
  status: VeeProjectStatus;
  created_at: string;
  updated_at: string;
};

export type VeeField = {
  id?: string;
  project_id: string;
  page_number: number;
  question_number: number;
  field_type: VeeFieldType;
  answer_value: string;
  correct_answer: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points: number;
};
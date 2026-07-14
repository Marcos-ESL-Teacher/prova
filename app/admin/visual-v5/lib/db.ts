import { supabase } from "../../../../lib/supabase";

export type VeeField = {
  id?: string;
  project_id: string;
  page_id?: string | null;
  question_number: number;
  field_type: string;
  label?: string | null;
  answer_value?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: number;
  required?: boolean;
  sort_order?: number;
  metadata?: any;
  is_deleted?: boolean;
};

const DEFAULT_FIELD_TYPE = "short_text";


export type VeeProject = {
  id: string;
  exam_id?: string | null;
  pdf_path?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
};

export async function getProjectById(
  projectId: string
): Promise<VeeProject | null> {
  const normalizedProjectId = projectId.trim();

  if (!normalizedProjectId) {
    throw new Error("Project ID não informado.");
  }

  const { data, error } = await supabase
    .from("vee_projects")
    .select("*")
    .eq("id", normalizedProjectId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

export async function getPdfSignedUrl(
  pdfPath: string,
  expiresInSeconds = 60 * 60
): Promise<string> {
  const normalizedPdfPath = pdfPath.trim();

  console.log("========== PDF ==========");
  console.log("pdfPath:", normalizedPdfPath);

  if (!normalizedPdfPath) {
    throw new Error("O projeto não possui pdf_path.");
  }

  const { data, error } = await supabase.storage
    .from("exam-pdfs")
    .createSignedUrl(normalizedPdfPath, expiresInSeconds);

  console.log("signedUrl data:", data);
  console.log("signedUrl error:", error);

  if (error) throw error;

  if (!data?.signedUrl) {
    throw new Error("Não foi possível gerar a URL assinada do PDF.");
  }

  console.log("signedUrl:", data.signedUrl);

  return data.signedUrl;
}

export async function getProjectByExamId(examId: string) {
  const { data, error } = await supabase
    .from("vee_projects")
    .select("*")
    .eq("exam_id", examId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createProject(examId: string) {
  const { data, error } = await supabase
    .from("vee_projects")
    .insert({
      exam_id: examId,
      status: "draft",
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getOrCreateProject(examId: string) {
  const existing = await getProjectByExamId(examId);
  if (existing) return existing;

  return createProject(examId);
}

export async function updateProjectPdf(projectId: string, pdfPath: string) {
  const { data, error } = await supabase
    .from("vee_projects")
    .update({
      pdf_path: pdfPath,
      status: "ready",
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getFieldsByProjectId(projectId: string) {
  const { data, error } = await supabase
    .from("vee_fields")
    .select("*")
    .eq("project_id", projectId)
    .eq("is_deleted", false)
    .order("sort_order", { ascending: true })
    .order("question_number", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function saveFieldsForProject(
  projectId: string,
  fields: VeeField[]
) {
  const { error: deleteError } = await supabase
    .from("vee_fields")
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (deleteError) throw deleteError;

  if (fields.length === 0) return [];

  const rows = fields.map((field, index) => ({
    project_id: projectId,
    page_id: field.page_id || null,
    question_number: Number(field.question_number || index + 1),
    field_type: field.field_type || DEFAULT_FIELD_TYPE,
    label: field.label || `Q${field.question_number || index + 1}`,
    answer_value: field.answer_value || "",
    x: Number(field.x),
    y: Number(field.y),
    width: Number(field.width),
    height: Number(field.height),
    points: Number(field.points || 1),
    required: field.required ?? true,
    sort_order: Number(field.sort_order || index + 1),
    metadata: field.metadata || {},
    is_deleted: false,
    updated_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("vee_fields")
    .insert(rows)
    .select("*");

  if (error) throw error;
  return data || [];
}

export async function createField(field: VeeField) {
  const { data, error } = await supabase
    .from("vee_fields")
    .insert({
      project_id: field.project_id,
      page_id: field.page_id || null,
      question_number: field.question_number,
      field_type: field.field_type || DEFAULT_FIELD_TYPE,
      label: field.label || `Q${field.question_number}`,
      answer_value: field.answer_value || "",
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      points: field.points || 1,
      required: field.required ?? true,
      sort_order: field.sort_order || field.question_number,
      metadata: field.metadata || {},
      is_deleted: false,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateField(fieldId: string, updates: Partial<VeeField>) {
  const { data, error } = await supabase
    .from("vee_fields")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fieldId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteField(fieldId: string) {
  const { error } = await supabase
    .from("vee_fields")
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fieldId);

  if (error) throw error;
}

export async function deleteAllFieldsByProjectId(projectId: string) {
  const { error } = await supabase
    .from("vee_fields")
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq("project_id", projectId);

  if (error) throw error;
}
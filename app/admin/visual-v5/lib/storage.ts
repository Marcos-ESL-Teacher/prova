import { supabase } from "../../../../lib/supabase";

const BUCKET = "exam-pdfs";

export async function uploadVeePdf(projectId: string, file: File) {
  const safeName = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-");

  const path = `vee/${projectId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });

  if (error) throw error;

  return path;
}

export async function getVeePdfUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 6);

  if (error) throw error;

  return data.signedUrl;
}
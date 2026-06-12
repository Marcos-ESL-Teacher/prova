import ProvaClient from "./ProvaClient";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    book?: string;
    mode?: string;
    chapter?: string;
    sub?: string;
  }>;
}) {
  const params = await searchParams;

  const book = params.book ?? "SBS Book 1 Plus";
  const mode = params.mode ?? "chapter";
  const chapter = params.chapter ?? "Chapter 1";
  const sub = params.sub ?? "Provas";

  const unitFolder = mode === "chapter" ? chapter : "HomeTest";
  const subfolderName = sub;

  return (
    <ProvaClient
      book={book}
      unitFolder={unitFolder}
      subfolderName={subfolderName}
    />
  );
}
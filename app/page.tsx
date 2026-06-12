import ProvaClient from "./ProvaClient";

type SearchParams = Promise<{
  book?: string;
  mode?: string;
  chapter?: string;
  sub?: string;
}>;

export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams;
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
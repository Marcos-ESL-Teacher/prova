import { Suspense } from "react";
import ProvaClient from "./ProvaClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Carregando prova...</div>}>
      <ProvaClient />
    </Suspense>
  );
}
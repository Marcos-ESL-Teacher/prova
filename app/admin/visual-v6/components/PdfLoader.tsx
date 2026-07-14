"use client";

import { useEffect, useRef } from "react";
import {
  getPdfSignedUrl,
  getProjectById,
} from "../../visual-v5/lib/db";

export type LoadedProjectPdf = {
  fileName: string;
  fileSize: number;
  objectUrl: string;
  pdfPath: string;
};

type PdfLoaderProps = {
  projectId: string;
  onLoaded: (pdf: LoadedProjectPdf) => void;
  onLoadingChange?: (loading: boolean) => void;
  onMessage?: (message: string) => void;
  onError?: (message: string) => void;
};

function getFileNameFromPath(path: string): string {
  const cleanPath = path.split("?")[0];
  const parts = cleanPath.split("/");

  return decodeURIComponent(parts[parts.length - 1] || "prova.pdf");
}

export default function PdfLoader({
  projectId,
  onLoaded,
  onLoadingChange,
  onMessage,
  onError,
}: PdfLoaderProps) {
  const callbacksRef = useRef({
    onLoaded,
    onLoadingChange,
    onMessage,
    onError,
  });

  const lastLoadedProjectIdRef = useRef("");

  useEffect(() => {
    callbacksRef.current = {
      onLoaded,
      onLoadingChange,
      onMessage,
      onError,
    };
  }, [onLoaded, onLoadingChange, onMessage, onError]);

  useEffect(() => {
    const normalizedProjectId = projectId.trim();

    if (!normalizedProjectId) {
      lastLoadedProjectIdRef.current = "";
      return;
    }

    if (lastLoadedProjectIdRef.current === normalizedProjectId) {
      return;
    }

    let cancelled = false;

    async function loadProjectPdf() {
      const callbacks = callbacksRef.current;

      try {
        callbacks.onLoadingChange?.(true);
        callbacks.onError?.("");
        callbacks.onMessage?.("Buscando o PDF do projeto...");

        const project = await getProjectById(normalizedProjectId);

        if (cancelled) return;

        if (!project) {
          throw new Error("Projeto VEE não encontrado.");
        }

        const pdfPath =
          typeof project.pdf_path === "string"
            ? project.pdf_path.trim()
            : "";

        if (!pdfPath) {
          throw new Error(
            "Este projeto ainda não possui um PDF salvo em pdf_path."
          );
        }

        const signedUrl = await getPdfSignedUrl(pdfPath);

        if (cancelled) return;

        lastLoadedProjectIdRef.current = normalizedProjectId;

        callbacks.onLoaded({
          fileName: getFileNameFromPath(pdfPath),
          fileSize: 0,
          objectUrl: signedUrl,
          pdfPath,
        });

        callbacks.onMessage?.("PDF do projeto carregado automaticamente.");
      } catch (error: any) {
        if (cancelled) return;

        lastLoadedProjectIdRef.current = "";

        callbacks.onError?.(
          error?.message || "Não foi possível carregar o PDF do projeto."
        );
        callbacks.onMessage?.("");
      } finally {
        if (!cancelled) {
          callbacks.onLoadingChange?.(false);
        }
      }
    }

    loadProjectPdf();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return null;
}

"use client"

import { supabase } from "../lib/supabase"
import { useState } from "react"

export default function ProvaClient({ book, unitFolder, subfolderName }: any) {

  const [mensagem, setMensagem] = useState("")

  async function enviarProva() {
    try {
      const { data, error } = await supabase
        .from("prova") // ⚠️ depois você pode trocar pelo nome da sua tabela
        .insert([
          { resposta: "Teste de envio funcionando ✅" }
        ])

      if (error) {
        console.log("ERRO:", error)
        setMensagem("Erro ao enviar!")
      } else {
        console.log("SUCESSO:", data)
        setMensagem("Prova enviada com sucesso ✅")
      }

    } catch (err) {
      console.log("FALHA:", err)
      setMensagem("Falha geral!")
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Prova</h1>
      <p>Sistema funcionando ✅</p>

      <button onClick={enviarProva}>
        Enviar Prova
      </button>

      <p>{mensagem}</p>
    </div>
  )
}
``
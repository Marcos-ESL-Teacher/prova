import { NextResponse } from "next/server"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const senhaDigitada = body?.password || ""
    const senhaCorreta = process.env.EXAM_PASSWORD || ""

    if (!senhaCorreta) {
      return NextResponse.json(
        { ok: false, message: "Senha do servidor não configurada." },
        { status: 500 }
      )
    }

    if (senhaDigitada === senhaCorreta) {
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json(
      { ok: false, message: "Senha incorreta." },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { ok: false, message: "Erro ao validar senha." },
      { status: 500 }
    )
  }
}
``
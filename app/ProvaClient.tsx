"use client"

import { createClient } from '@supabase/supabase-js'

// pegar variáveis com segurança
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ""

// mostrar no console (teste)
console.log("URL:", supabaseUrl)
console.log("KEY:", supabaseKey)

// criar cliente
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
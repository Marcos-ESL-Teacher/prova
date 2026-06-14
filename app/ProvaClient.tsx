import { createClient } from '@supabase/supabase-js'

// pegando variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

// 🔥 TESTE IMPORTANTE (NÃO APAGUE AINDA)
console.log("URL:", supabaseUrl)
console.log("KEY:", supabaseKey)

// criando cliente
const supabase = createClient(supabaseUrl, supabaseKey)

export default supabase
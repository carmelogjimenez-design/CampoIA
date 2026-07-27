import { createClient } from '@supabase/supabase-js'

// Las credenciales se leen de variables de entorno de Vercel.
// Son públicas (van en el navegador), pero mantenerlas fuera del
// código permite cambiarlas sin tocar el código.
const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_KEY as string

if (!url || !key) {
  console.error('[CAMPO] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_KEY en las variables de entorno de Vercel.')
}

export const supabase = createClient(url, key)

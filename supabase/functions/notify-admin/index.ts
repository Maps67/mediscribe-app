// Archivo: supabase/functions/notify-admin/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// Esta función recibirá los datos cuando un usuario se registre
serve(async (req) => {
  try {
    // 1. Obtenemos los datos del usuario nuevo (el "payload")
    const { record } = await req.json()

    // 2. Aquí imprimimos en los logs de Supabase quién llegó (para verificar)
    console.log("¡NUEVO USUARIO REGISTRADO!", record.email)

    // NOTA: Aquí más adelante conectaremos el servicio de email (Resend)
    // Para no complicarte ahora, primero aseguramos que la función suba correctamente.

    return new Response(
      JSON.stringify({ message: "Notificación procesada", user: record.email }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    )
  }
})
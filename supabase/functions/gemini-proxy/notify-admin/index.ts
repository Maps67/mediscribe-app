// Archivo: supabase/functions/notify-admin/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))
// Archivo: supabase/functions/notify-admin/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend@2.0.0"

const resend = new Resend(Deno.env.get("RESEND_API_KEY"))

serve(async (req) => {
  try {
    const { record } = await req.json()
    const emailUsuario = record.email

    console.log("Procesando alerta para:", emailUsuario)

    const { data, error } = await resend.emails.send({
      from: "VitalScribe Alerta <onboarding@resend.dev>",
      // CAMBIA ESTO POR TU CORREO REAL:
      to: ["contacto@pixelartestudio.art"], 
      subject: "🚨 Nuevo Usuario Registrado en VitalScribe",
      html: `
        <h1>Nuevo Registro Detectado</h1>
        <p>Un nuevo médico se ha unido a la plataforma.</p>
        <ul>
          <li><strong>Email:</strong> ${emailUsuario}</li>
          <li><strong>Fecha:</strong> ${new Date().toLocaleString()}</li>
        </ul>
        <p>Revisar en el panel de Supabase para más detalles.</p>
      `,
    })

    if (error) {
      console.error("Error enviando correo:", error)
      return new Response(JSON.stringify({ error }), { status: 400 })
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
})
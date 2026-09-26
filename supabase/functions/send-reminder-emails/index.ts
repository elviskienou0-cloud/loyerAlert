// Edge Function appelée quotidiennement par pg_cron (voir la migration
// 20260926120000_reminders_module.sql). Elle lit les notifications pas
// encore emailées, envoie un email via Resend, puis marque email_sent_at.
//
// Secrets requis (à définir avec `supabase secrets set`, jamais en dur ici) :
//   RESEND_API_KEY       — clé API Resend (https://resend.com)
//   REMINDER_FROM_EMAIL  — optionnel, ex. "LoyerAlert <alertes@tondomaine.com>"
//                           par défaut : l'adresse de test Resend (onboarding@resend.dev)
//
// SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont injectées automatiquement
// par Supabase pour toute Edge Function, pas besoin de les définir.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("REMINDER_FROM_EMAIL") ?? "LoyerAlert <onboarding@resend.dev>";

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
};

Deno.serve(async () => {
  if (!RESEND_API_KEY) {
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY non configuré (supabase secrets set RESEND_API_KEY=...)" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: pending, error } = await supabase
    .from("notifications")
    .select("id, user_id, title, message")
    .is("email_sent_at", null)
    .order("created_at", { ascending: true })
    .limit(200);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const notifications = (pending ?? []) as Notification[];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const notif of notifications) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", notif.user_id)
      .maybeSingle();

    const email = profile?.email;
    if (!email) {
      skipped++;
      continue;
    }

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: email,
          subject: `LoyerAlert — ${notif.title}`,
          html: `<p>Bonjour ${profile?.full_name ?? ""},</p><p>${notif.message}</p><p style="color:#888">— LoyerAlert</p>`,
        }),
      });

      if (res.ok) {
        await supabase
          .from("notifications")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", notif.id);
        sent++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return new Response(
    JSON.stringify({ total: notifications.length, sent, failed, skipped }),
    { headers: { "Content-Type": "application/json" } },
  );
});

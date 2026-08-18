import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { shortDate } from "@/lib/format";
import { DEFAULT_TEMPLATES, loadTemplates, saveTemplates, type ReminderKind } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({
    meta: [
      { title: "Profil — LoyerAlert" },
      { name: "description", content: "Vos informations, votre abonnement et vos modèles de relance WhatsApp." },
      { property: "og:title", content: "Profil — LoyerAlert" },
      { property: "og:description", content: "Gérez votre compte LoyerAlert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Profile,
});

function Profile() {
  const queryClient = useQueryClient();
  const { data: account } = useAccount();
  const [templates, setTemplates] = useState<Record<ReminderKind, string>>(DEFAULT_TEMPLATES);
  const [form, setForm] = useState({ full_name: "", phone: "" });

  useEffect(() => setTemplates(loadTemplates()), []);

  const profile = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return null;
      const { data: p, error } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (error) throw error;
      return p;
    },
  });

  useEffect(() => {
    if (profile.data) setForm({ full_name: profile.data.full_name ?? "", phone: profile.data.phone ?? "" });
  }, [profile.data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw new Error("Non connecté");
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name, phone: form.phone })
        .eq("id", data.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profil enregistré.");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profil</h1>

      {profile.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <form
          className="surface space-y-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label>Nom complet</Label>
            <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Téléphone</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <p className="text-sm text-muted-foreground">E-mail : {profile.data?.email ?? "—"}</p>
          <Button type="submit" disabled={save.isPending}>
            Enregistrer
          </Button>
        </form>
      )}

      {account ? (
        <div className="surface p-5 text-sm">
          <p className="font-semibold">Abonnement</p>
          <p className="mt-1 text-muted-foreground">
            Formule : {account.plan} · statut : {account.status}
          </p>
          <p className="text-muted-foreground">
            {account.status === "trial"
              ? `Essai jusqu'au ${shortDate(account.trial_ends_at)}`
              : account.ends_at
                ? `Valide jusqu'au ${shortDate(account.ends_at)}`
                : "Aucun abonnement actif"}
          </p>
        </div>
      ) : null}

      <div className="surface space-y-3 p-5">
        <p className="font-semibold">Messages de relance</p>
        <p className="text-xs text-muted-foreground">
          Variables disponibles : {"{nom}"}, {"{montant}"}, {"{date}"}.
        </p>
        {(
          [
            ["before", "Avant échéance"],
            ["onday", "Jour de l'échéance"],
            ["after", "Après échéance"],
          ] as [ReminderKind, string][]
        ).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label>{label}</Label>
            <Textarea
              value={templates[key]}
              onChange={(e) => setTemplates({ ...templates, [key]: e.target.value })}
            />
          </div>
        ))}
        <Button
          variant="outline"
          onClick={() => {
            saveTemplates(templates);
            toast.success("Messages enregistrés.");
          }}
        >
          Enregistrer les messages
        </Button>
      </div>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Globe, MessageCircle, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { DEFAULT_TEMPLATES, loadTemplates, saveTemplates, type ReminderKind } from "@/lib/whatsapp";

export const Route = createFileRoute("/_authenticated/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — LoyerAlert" },
      {
        name: "description",
        content: "Langue de l'application, modèles de relance WhatsApp et préférences de confidentialité.",
      },
      { property: "og:title", content: "Paramètres — LoyerAlert" },
      { property: "og:description", content: "Réglez la langue, vos relances et vos préférences LoyerAlert." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const [templates, setTemplates] = useState<Record<ReminderKind, string>>(DEFAULT_TEMPLATES);
  useEffect(() => setTemplates(loadTemplates()), []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl font-bold">Paramètres</h1>
        <p className="text-sm text-muted-foreground">Personnalisez votre expérience LoyerAlert.</p>
      </div>

      <section className="surface flex items-center justify-between gap-4 p-5 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <Globe className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Langue de l'application</p>
            <p className="text-sm text-muted-foreground">Français, anglais, portugais, espagnol, arabe.</p>
          </div>
        </div>
        <LanguageSwitcher />
      </section>

      <section className="surface space-y-3 p-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <MessageCircle className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Messages de relance WhatsApp</p>
            <p className="text-xs text-muted-foreground">
              Variables disponibles : {"{nom}"}, {"{montant}"}, {"{date}"}.
            </p>
          </div>
        </div>
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
          onClick={() => {
            saveTemplates(templates);
            toast.success("Messages enregistrés ✓");
          }}
        >
          Enregistrer les messages
        </Button>
      </section>

      <section className="surface space-y-2 p-5 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="font-semibold">Confidentialité</p>
            <p className="text-sm text-muted-foreground">Vos données ne sont visibles que par vous.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-1 text-sm">
          <Link to="/confidentialite" className="text-primary underline">
            Politique de confidentialité
          </Link>
          <Link to="/cookies" className="text-primary underline">
            Politique de cookies
          </Link>
        </div>
      </section>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useAccount";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { fcfa } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/locataires")({
  head: () => ({
    meta: [
      { title: "Locataires — LoyerAlert" },
      { name: "description", content: "Fiches locataires : loyer, échéance, retards et relance WhatsApp." },
      { property: "og:title", content: "Locataires — LoyerAlert" },
      { property: "og:description", content: "Suivez chaque locataire et relancez-le en un clic." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Tenants,
});

function Tenants() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    property_id: "",
    move_in_date: "",
    rent_amount: "",
    due_day: "5",
  });

  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase.from("properties").select("id, name, rent_amount, due_day");
      if (error) throw error;
      return data ?? [];
    },
  });

  const list = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("*, properties(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    retry: 2,
  });

  // Actualisation automatique : dès qu'un logement ou un locataire change côté
  // Supabase (autre appareil, autre onglet, action admin…), ces listes se
  // remettent à jour toutes seules, sans rechargement manuel.
  useRealtimeSync(["tenants", "properties"], [["tenants"], ["properties"]]);

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("tenants").insert({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        property_id: form.property_id || null,
        move_in_date: form.move_in_date || null,
        rent_amount: Number(form.rent_amount || 0),
        due_day: Number(form.due_day || 5),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locataire ajouté.");
      logActivity("tenant_created", { name: form.full_name });
      setOpen(false);
      setForm({ full_name: "", phone: "", property_id: "", move_in_date: "", rent_amount: "", due_day: "5" });
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Locataires</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau locataire</DialogTitle>
            </DialogHeader>
            <form
              className="stagger space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Téléphone (WhatsApp)</Label>
                <Input
                  required
                  placeholder="70 00 00 00"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Logement</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.property_id}
                  onChange={(e) => {
                    const p = properties.data?.find((x) => x.id === e.target.value);
                    setForm({
                      ...form,
                      property_id: e.target.value,
                      rent_amount: p ? String(p.rent_amount) : form.rent_amount,
                      due_day: p ? String(p.due_day) : form.due_day,
                    });
                  }}
                >
                  <option value="">— Aucun —</option>
                  {(properties.data ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Date d'entrée</Label>
                <Input
                  type="date"
                  value={form.move_in_date}
                  onChange={(e) => setForm({ ...form, move_in_date: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Loyer (FCFA)</Label>
                <Input
                  type="number"
                  required
                  value={form.rent_amount}
                  onChange={(e) => setForm({ ...form, rent_amount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Jour d'échéance (1-28)</Label>
                <Input
                  type="number"
                  required
                  value={form.due_day}
                  onChange={(e) => setForm({ ...form, due_day: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {list.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : list.data && list.data.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {list.data.map((t) => (
            <Link
              key={t.id}
              to="/locataires/$tenantId"
              params={{ tenantId: t.id }}
              className="surface block p-4 transition-shadow hover:shadow-md"
            >
              <p className="font-semibold uppercase">{t.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {(t.properties as { name: string } | null)?.name ?? "Sans logement"}
              </p>
              <p className="mt-2 font-semibold">{fcfa(t.rent_amount)}</p>
              <p className="text-sm text-muted-foreground">Échéance : le {t.due_day} du mois</p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="surface p-6 text-center text-sm text-muted-foreground">
          Aucun locataire pour le moment.
        </p>
      )}
    </div>
  );
}

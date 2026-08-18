import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity, useAccount } from "@/hooks/useAccount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fcfa } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/logements")({
  head: () => ({
    meta: [
      { title: "Logements — LoyerAlert" },
      { name: "description", content: "Gérez vos chambres, studios et villas : loyer et date d'échéance." },
      { property: "og:title", content: "Logements — LoyerAlert" },
      { property: "og:description", content: "Vos logements et leurs loyers mensuels en FCFA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Properties,
});

function Properties() {
  const queryClient = useQueryClient();
  const { data: account } = useAccount();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", rent_amount: "", due_day: "5", description: "" });

  const list = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    retry: 2,
  });

  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("properties").insert({
        name: form.name.trim(),
        address: form.address.trim() || null,
        rent_amount: Number(form.rent_amount || 0),
        due_day: Number(form.due_day || 5),
        description: form.description.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Logement ajouté.");
      logActivity("property_created", { name: form.name });
      setForm({ name: "", address: "", rent_amount: "", due_day: "5", description: "" });
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["properties"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("properties").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Logement supprimé.");
      void queryClient.invalidateQueries({ queryKey: ["properties"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Logements</h1>
          {account ? (
            <p className="text-sm text-muted-foreground">
              {account.property_count} / {account.property_limit} utilisés
            </p>
          ) : null}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 size-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau logement</DialogTitle>
            </DialogHeader>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                create.mutate();
              }}
            >
              <F label="Nom / numéro" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
              <F label="Adresse" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
              <F
                label="Loyer (FCFA)"
                type="number"
                value={form.rent_amount}
                onChange={(v) => setForm({ ...form, rent_amount: v })}
                required
              />
              <F
                label="Jour d'échéance (1-28)"
                type="number"
                value={form.due_day}
                onChange={(v) => setForm({ ...form, due_day: v })}
                required
              />
              <div className="space-y-1.5">
                <Label>Description (facultatif)</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
          {list.data.map((p) => (
            <div key={p.id} className="surface flex items-start justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">{p.name}</p>
                {p.address ? <p className="text-sm text-muted-foreground">{p.address}</p> : null}
                <p className="mt-2 text-sm">
                  Loyer : <span className="font-semibold">{fcfa(p.rent_amount)}</span>
                </p>
                <p className="text-sm text-muted-foreground">Échéance : {p.due_day} de chaque mois</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Supprimer"
                onClick={() => remove.mutate(p.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="surface p-6 text-center text-sm text-muted-foreground">
          Aucun logement pour le moment. Ajoutez votre première chambre ou studio.
        </p>
      )}
    </div>
  );
}

function F({
  label,
  value,
  onChange,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Archive } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity, useAccount } from "@/hooks/useAccount";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
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
      {
        name: "description",
        content: "Gérez vos chambres, studios et villas : loyer et date d'échéance.",
      },
      { property: "og:title", content: "Logements — LoyerAlert" },
      { property: "og:description", content: "Vos logements et leurs loyers mensuels en FCFA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Properties,
});

type PropertyForm = {
  name: string;
  address: string;
  rent_amount: string;
  due_day: string;
  description: string;
};
const emptyForm: PropertyForm = {
  name: "",
  address: "",
  rent_amount: "",
  due_day: "5",
  description: "",
};

function Properties() {
  const queryClient = useQueryClient();
  const { data: account } = useAccount();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PropertyForm>(emptyForm);

  const list = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    retry: 2,
  });

  useRealtimeSync(["properties"], [["properties"]]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        address: form.address.trim() || null,
        rent_amount: Number(form.rent_amount),
        due_day: Number(form.due_day),
        description: form.description.trim() || null,
      };
      if (!payload.name) throw new Error("Le nom du logement est obligatoire.");
      if (!Number.isFinite(payload.rent_amount) || payload.rent_amount < 0)
        throw new Error("Le loyer doit être positif.");
      if (!Number.isInteger(payload.due_day) || payload.due_day < 1 || payload.due_day > 28)
        throw new Error("Le jour d'échéance doit être compris entre 1 et 28.");

      if (editingId) {
        const { error } = await supabase.from("properties").update(payload).eq("id", editingId);
        if (error) throw error;
        return "updated" as const;
      }

      const { error } = await supabase.from("properties").insert(payload);
      if (error) throw error;
      return "created" as const;
    },
    onSuccess: (mode) => {
      toast.success(mode === "created" ? "Logement ajouté." : "Logement modifié.");
      logActivity(mode === "created" ? "property_created" : "property_updated", {
        name: form.name,
        property_id: editingId,
      });
      closeForm();
      void queryClient.invalidateQueries({ queryKey: ["properties"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("archive_property", { p_property_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Logement archivé. L'historique financier est conservé.");
      void queryClient.invalidateQueries({ queryKey: ["properties"] });
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      void queryClient.invalidateQueries({ queryKey: ["rents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }

  function openEdit(property: NonNullable<typeof list.data>[number]) {
    setEditingId(property.id);
    setForm({
      name: property.name ?? "",
      address: property.address ?? "",
      rent_amount: String(property.rent_amount ?? ""),
      due_day: String(property.due_day ?? 5),
      description: property.description ?? "",
    });
    setOpen(true);
  }

  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function archiveProperty(id: string, name: string) {
    if (
      window.confirm(`Archiver « ${name} » ? Les loyers et paiements historiques seront conservés.`)
    ) {
      archive.mutate(id);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Logements</h1>
          {account ? (
            <p className="text-sm text-muted-foreground">
              {account.property_count} / {account.property_limit} utilisés
            </p>
          ) : null}
        </div>
        <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : closeForm())}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 size-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier le logement" : "Nouveau logement"}</DialogTitle>
            </DialogHeader>
            <form
              className="stagger space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <F
                label="Nom / numéro"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
                required
              />
              <F
                label="Adresse"
                value={form.address}
                onChange={(v) => setForm({ ...form, address: v })}
              />
              <F
                label="Loyer (FCFA)"
                type="number"
                min="0"
                value={form.rent_amount}
                onChange={(v) => setForm({ ...form, rent_amount: v })}
                required
              />
              <F
                label="Jour d'échéance (1-30)"
                type="number"
                min="1"
                max="28"
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
              <Button type="submit" className="w-full" disabled={save.isPending}>
                {save.isPending
                  ? "Enregistrement…"
                  : editingId
                    ? "Enregistrer les modifications"
                    : "Enregistrer"}
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
              <div className="min-w-0">
                <p className="truncate font-semibold">{p.name}</p>
                {p.address ? (
                  <p className="truncate text-sm text-muted-foreground">{p.address}</p>
                ) : null}
                <p className="mt-2 text-sm">
                  Loyer : <span className="font-semibold">{fcfa(p.rent_amount)}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  Échéance : {p.due_day} de chaque mois
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Modifier"
                  onClick={() => openEdit(p)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Archiver"
                  disabled={archive.isPending}
                  onClick={() => archiveProperty(p.id, p.name)}
                >
                  <Archive className="size-4 text-destructive" />
                </Button>
              </div>
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
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
  max?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input
        type={type}
        min={min}
        max={max}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

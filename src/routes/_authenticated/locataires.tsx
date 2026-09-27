import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, UserX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/hooks/useAccount";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fcfa } from "@/lib/format";

type TenantForm = {
  full_name: string;
  phone: string;
  property_id: string;
  move_in_date: string;
  rent_amount: string;
  due_day: string;
};
const emptyForm: TenantForm = {
  full_name: "",
  phone: "",
  property_id: "",
  move_in_date: "",
  rent_amount: "",
  due_day: "5",
};

export const Route = createFileRoute("/_authenticated/locataires")({
  head: () => ({
    meta: [
      { title: "Locataires — LoyerAlert" },
      {
        name: "description",
        content: "Fiches locataires : loyer, échéance, retards et relance WhatsApp.",
      },
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);

  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("properties")
        .select("id, name, rent_amount, due_day")
        .is("archived_at", null);
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
        .eq("active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    retry: 2,
  });

  useRealtimeSync(["tenants", "properties"], [["tenants"], ["properties"]]);

  const save = useMutation({
    mutationFn: async () => {
      const name = form.full_name.trim();
      const phone = form.phone.trim();
      const rent = Number(form.rent_amount);
      const due = Number(form.due_day);
      if (!name) throw new Error("Le nom du locataire est obligatoire.");
      if (phone.replace(/\D/g, "").length < 8) throw new Error("Numéro de téléphone incomplet.");
      if (!Number.isFinite(rent) || rent < 0) throw new Error("Le loyer doit être positif.");
      if (!Number.isInteger(due) || due < 1 || due > 28)
        throw new Error("Le jour d'échéance doit être compris entre 1 et 28.");

      const payload = {
        full_name: name,
        phone,
        property_id: form.property_id || null,
        move_in_date: form.move_in_date || null,
        rent_amount: rent,
        due_day: due,
      };
      if (editingId) {
        const { error } = await supabase.from("tenants").update(payload).eq("id", editingId);
        if (error) throw error;
        return "updated" as const;
      }
      const { error } = await supabase.from("tenants").insert(payload);
      if (error) throw error;
      return "created" as const;
    },
    onSuccess: (mode) => {
      toast.success(mode === "created" ? "Locataire ajouté." : "Locataire modifié.");
      logActivity(mode === "created" ? "tenant_created" : "tenant_updated", {
        name: form.full_name,
        tenant_id: editingId,
      });
      closeForm();
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.invalidateQueries({ queryKey: ["properties"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("deactivate_tenant", { p_tenant_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Locataire désactivé. Son historique est conservé.");
      void queryClient.invalidateQueries({ queryKey: ["tenants"] });
      void queryClient.invalidateQueries({ queryKey: ["rents"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  }
  function openEdit(t: NonNullable<typeof list.data>[number]) {
    setEditingId(t.id);
    setForm({
      full_name: t.full_name ?? "",
      phone: t.phone ?? "",
      property_id: t.property_id ?? "",
      move_in_date: t.move_in_date ?? "",
      rent_amount: String(t.rent_amount ?? ""),
      due_day: String(t.due_day ?? 5),
    });
    setOpen(true);
  }
  function closeForm() {
    setOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  }
  function deactivateTenant(id: string, name: string) {
    if (
      window.confirm(`Désactiver « ${name} » ? L'historique des loyers et paiements sera conservé.`)
    )
      deactivate.mutate(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Locataires</h1>
        <Dialog open={open} onOpenChange={(value) => (value ? setOpen(true) : closeForm())}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 size-4" /> Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Modifier le locataire" : "Nouveau locataire"}</DialogTitle>
            </DialogHeader>
            <form
              className="stagger space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <Field
                label="Nom"
                value={form.full_name}
                onChange={(v) => setForm({ ...form, full_name: v })}
                required
              />
              <Field
                label="Téléphone (WhatsApp)"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
                placeholder="+226 70 00 00 00"
                required
              />
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
              <Field
                label="Date d'entrée"
                type="date"
                value={form.move_in_date}
                onChange={(v) => setForm({ ...form, move_in_date: v })}
              />
              <Field
                label="Loyer (FCFA)"
                type="number"
                min="0"
                value={form.rent_amount}
                onChange={(v) => setForm({ ...form, rent_amount: v })}
                required
              />
              <Field
                label="Jour d'échéance (1-28)"
                type="number"
                min="1"
                max="28"
                value={form.due_day}
                onChange={(v) => setForm({ ...form, due_day: v })}
                required
              />
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
          {list.data.map((t) => (
            <div key={t.id} className="surface flex items-start justify-between gap-3 p-4">
              <Link
                to="/locataires/$tenantId"
                params={{ tenantId: t.id }}
                className="min-w-0 flex-1 transition-opacity hover:opacity-80"
              >
                <p className="truncate font-semibold uppercase">{t.full_name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {(t.properties as { name: string } | null)?.name ?? "Sans logement"}
                </p>
                <p className="mt-2 font-semibold">{fcfa(t.rent_amount)}</p>
                <p className="text-sm text-muted-foreground">Échéance : le {t.due_day} du mois</p>
              </Link>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Modifier"
                  onClick={() => openEdit(t)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Désactiver"
                  disabled={deactivate.isPending}
                  onClick={() => deactivateTenant(t.id, t.full_name)}
                >
                  <UserX className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
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

function Field({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
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
        required={required}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

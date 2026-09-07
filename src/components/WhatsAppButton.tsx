import { useState } from "react";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  buildKindMessage,
  buildWhatsAppLink,
  MESSAGE_KINDS,
  type MessageKind,
} from "@/lib/whatsapp";

type Props = {
  /** Numéro du destinataire (brut, sera nettoyé/normalisé). */
  phone: string;
  /** Nom du locataire. */
  name: string;
  /** Montant concerné (FCFA). */
  amount: number;
  /** Date d'échéance (ISO) affichée dans le message. */
  date: string;
  /** Type de message proposé en premier dans le menu. */
  defaultKind?: MessageKind;
  size?: "sm" | "default" | "icon";
  variant?: "default" | "outline" | "ghost";
  label?: boolean;
  className?: string;
  /** Callback après ouverture de WhatsApp (ex. journal d'activité). */
  onOpen?: (kind: MessageKind) => void;
};

/**
 * Bouton « Contacter sur WhatsApp » — simple redirection wa.me avec message
 * prérempli. Aucune API, aucun secret, rien n'est stocké côté serveur.
 */
export function WhatsAppButton({
  phone,
  name,
  amount,
  date,
  size = "sm",
  variant = "outline",
  label = false,
  className,
  onOpen,
}: Props) {
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState("");

  function open(message: string, kind: MessageKind) {
    const url = buildWhatsAppLink(phone, message);
    if (!url) {
      toast.error(
        "Numéro WhatsApp invalide. Veuillez vérifier le numéro du locataire.",
      );
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    toast.info("WhatsApp ouvert. Vérifiez le message puis appuyez sur Envoyer.");
    onOpen?.(kind);
  }

  function pick(kind: MessageKind) {
    if (kind === "custom") {
      setCustomText(`Bonjour ${name}, `);
      setCustomOpen(true);
      return;
    }
    open(buildKindMessage(kind, { nom: name, montant: amount, date }), kind);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size={size}
            variant={variant}
            className={className}
            aria-label="Contacter sur WhatsApp"
          >
            <MessageCircle className="size-4" />
            {label ? <span className="ml-2">Contacter sur WhatsApp</span> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {MESSAGE_KINDS.map((k) => (
            <DropdownMenuItem key={k.id} onSelect={() => pick(k.id)}>
              {k.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={customOpen} onOpenChange={setCustomOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Message personnalisé</DialogTitle>
          </DialogHeader>
          <Textarea
            rows={5}
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Votre message…"
          />
          <Button
            className="w-full"
            disabled={!customText.trim()}
            onClick={() => {
              setCustomOpen(false);
              open(customText.trim(), "custom");
            }}
          >
            <MessageCircle className="mr-2 size-4" /> Ouvrir WhatsApp
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

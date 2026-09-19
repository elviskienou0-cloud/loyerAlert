import { jsPDF } from "jspdf";
import { fcfa, monthLabel, shortDate } from "./format";

export type ReceiptData = {
  owner: string;
  tenant: string;
  property: string;
  amount: number;
  paidAt: string;
  period: string;
  reference: string;
  balance: number;
};

const BRAND = "#1f6f52";
const MUTED = "#6b7c74";
const INK = "#1c2b26";
const LINE = "#e3ece7";

/**
 * La police "helvetica" standard de jsPDF (encodage WinAnsi) ne contient pas
 * l'espace fine insécable (U+202F) que `Intl.NumberFormat("fr-FR")` utilise
 * comme séparateur de milliers — le glyphe s'affiche alors cassé dans le PDF.
 * On la remplace par une espace normale avant tout rendu.
 */
function pdfSafe(s: string): string {
  return s.replace(/[\u202F\u00A0]/g, " ");
}

/**
 * Génère un reçu de paiement en PDF (jsPDF, entièrement côté client — aucun
 * appel réseau) et déclenche son téléchargement.
 *
 * Remplace l'ancienne implémentation qui ouvrait une fenêtre d'impression
 * navigateur : ceci produit un vrai fichier .pdf, indépendant du navigateur
 * de l'utilisateur.
 */
export function printReceipt(d: ReceiptData) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 20;
  const contentWidth = pageWidth - marginX * 2;

  // En-tête
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(BRAND);
  doc.text("LOYERALERT", marginX, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  doc.text("Suivi des loyers — Afrique de l'Ouest", marginX, 28);

  doc.setDrawColor(LINE);
  doc.line(marginX, 33, marginX + contentWidth, 33);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(INK);
  doc.text("Reçu de paiement de loyer", marginX, 44);

  // Tableau des informations
  const rows: [string, string][] = [
    ["Référence", d.reference],
    ["Propriétaire", d.owner],
    ["Locataire", d.tenant],
    ["Logement", d.property],
    ["Période", monthLabel(d.period)],
    ["Date du paiement", shortDate(d.paidAt)],
    ["Reste à payer", pdfSafe(fcfa(d.balance))],
  ];

  let y = 56;
  const rowHeight = 9;
  doc.setFontSize(11);
  rows.forEach(([label, value], i) => {
    if (i > 0) {
      doc.setDrawColor(LINE);
      doc.line(marginX, y - rowHeight + 4, marginX + contentWidth, y - rowHeight + 4);
    }
    doc.setFont("helvetica", "normal");
    doc.setTextColor(MUTED);
    doc.text(label, marginX, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK);
    doc.text(value, marginX + contentWidth, y, { align: "right" });
    y += rowHeight;
  });

  // Montant payé, mis en avant
  y += 6;
  doc.setDrawColor(BRAND);
  doc.setLineWidth(0.6);
  doc.line(marginX, y, marginX + contentWidth, y);
  y += 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(INK);
  doc.text("Montant payé", marginX, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(BRAND);
  doc.text(pdfSafe(fcfa(d.amount)), marginX + contentWidth, y, { align: "right" });
  doc.setLineWidth(0.2);

  // Pied de page
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  doc.text(
    "Document généré automatiquement par LoyerAlert.",
    marginX,
    pageHeight - 15,
  );

  doc.save(`recu-${d.reference}.pdf`);
}

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

/** Ouvre un reçu imprimable (impression ou « Enregistrer en PDF »). */
export function printReceipt(d: ReceiptData) {
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Reçu ${d.reference}</title>
<style>
 body{font-family:system-ui,sans-serif;color:#1c2b26;margin:0;padding:32px;}
 .box{max-width:640px;margin:auto;border:1px solid #d7e0da;border-radius:14px;padding:28px}
 h1{font-size:20px;margin:0}
 .brand{color:#1f6f52;font-weight:700;letter-spacing:.04em}
 table{width:100%;border-collapse:collapse;margin-top:20px;font-size:14px}
 td{padding:9px 0;border-bottom:1px solid #eef2ef}
 td:last-child{text-align:right;font-weight:600}
 .total{font-size:20px;font-weight:700;margin-top:18px;color:#1f6f52}
 .muted{color:#6b7c74;font-size:12px;margin-top:24px}
</style></head><body><div class="box">
 <div class="brand">LOYERALERT</div>
 <h1>Reçu de paiement de loyer</h1>
 <table>
  <tr><td>Référence</td><td>${d.reference}</td></tr>
  <tr><td>Propriétaire</td><td>${d.owner}</td></tr>
  <tr><td>Locataire</td><td>${d.tenant}</td></tr>
  <tr><td>Logement</td><td>${d.property}</td></tr>
  <tr><td>Période</td><td>${monthLabel(d.period)}</td></tr>
  <tr><td>Date du paiement</td><td>${shortDate(d.paidAt)}</td></tr>
  <tr><td>Reste à payer</td><td>${fcfa(d.balance)}</td></tr>
 </table>
 <div class="total">Montant payé : ${fcfa(d.amount)}</div>
 <p class="muted">Document généré par LoyerAlert — Afrique de l'Ouest.</p>
</div>
<script>window.onload=()=>{window.print()}</script>
</body></html>`;
  const w = window.open("", "_blank", "width=780,height=900");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

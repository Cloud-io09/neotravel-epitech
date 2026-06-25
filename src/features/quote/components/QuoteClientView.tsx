"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { QuoteSummary, QuoteBreakdownData } from "../../../lib/ai/chat-response";

type QuoteData = QuoteSummary & { createdAt?: string };

function formatEur(amount: number): string {
  return amount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const months = [
    "janvier", "fevrier", "mars", "avril", "mai", "juin",
    "juillet", "aout", "septembre", "octobre", "novembre", "decembre",
  ];
  return `${day} ${months[month - 1]} ${year}`;
}

export function QuoteClientView({ quoteId }: { quoteId: string }) {
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/quotes/${quoteId}`)
      .then((res) => res.json() as Promise<QuoteData & { error?: string }>)
      .then((data) => {
        if (data.error) setError(data.error);
        else setQuote(data);
      })
      .catch(() => setError("Impossible de charger le devis."));
  }, [quoteId]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7fb", fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <header style={headerStyle}>
        <Link href="/" style={logoStyle}>NeoTravel</Link>
      </header>

      <main style={mainStyle}>
        {error && (
          <div style={errorStyle}>
            <p style={{ margin: "0 0 12px", fontWeight: 700, color: "#991b1b" }}>{error}</p>
            <Link href="/" style={linkStyle}>Retour a l&apos;accueil</Link>
          </div>
        )}

        {!error && !quote && (
          <p style={{ color: "#5e6b7e" }}>Chargement du devis…</p>
        )}

        {quote && (
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <div>
                <p style={kickerStyle}>Devis transport de groupe</p>
                <h1 style={titleStyle}>#{quote.quoteNumber}</h1>
              </div>
              <div style={priceBlockStyle}>
                <span style={priceStyle}>{formatEur(quote.priceTtc)}</span>
                <span style={priceLabelStyle}>TTC</span>
              </div>
            </div>

            {(quote.departureCity || quote.arrivalCity) && (
              <div style={routeStyle}>
                <span style={routeCityStyle}>{quote.departureCity ?? "—"}</span>
                <span style={routeArrowStyle}>→</span>
                <span style={routeCityStyle}>{quote.arrivalCity ?? "—"}</span>
              </div>
            )}

            <dl style={detailsGridStyle}>
              {quote.departureDate && (
                <div style={detailItemStyle}>
                  <dt style={dtStyle}>Date de depart</dt>
                  <dd style={ddStyle}>{formatDate(quote.departureDate)}</dd>
                </div>
              )}
              {quote.passengerCount && (
                <div style={detailItemStyle}>
                  <dt style={dtStyle}>Passagers</dt>
                  <dd style={ddStyle}>{quote.passengerCount}</dd>
                </div>
              )}
              {quote.vehicleCode && (
                <div style={detailItemStyle}>
                  <dt style={dtStyle}>Vehicule</dt>
                  <dd style={ddStyle}>{quote.vehicleCode}</dd>
                </div>
              )}
              {quote.distanceKm && (
                <div style={detailItemStyle}>
                  <dt style={dtStyle}>Distance</dt>
                  <dd style={ddStyle}>{quote.distanceKm} km</dd>
                </div>
              )}
            </dl>

            <div style={priceBreakdownStyle}>
              <div style={priceRowStyle}>
                <span>Prix HT</span>
                <strong>{formatEur(quote.priceHt)}</strong>
              </div>
              <div style={priceRowStyle}>
                <span>TVA 10%</span>
                <strong>{formatEur(quote.vatAmount)}</strong>
              </div>
              <div style={{ ...priceRowStyle, borderTop: "1px solid #d7e0ed", paddingTop: 12, marginTop: 4 }}>
                <span style={{ fontWeight: 900, color: "#071b40" }}>Total TTC</span>
                <strong style={{ fontSize: 20, color: "#071b40" }}>{formatEur(quote.priceTtc)}</strong>
              </div>
            </div>

            {quote.breakdown && <PriceAuditPanel breakdown={quote.breakdown} />}

            <p style={noticeStyle}>
              Ce devis est indicatif. Un conseiller NeoTravel vous contactera pour confirmer la disponibilite.
            </p>

            <Link href="/" style={ctaStyle}>
              Retour a l&apos;accueil
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

function pct(n: number): string {
  const sign = n >= 0 ? "+" : "−";
  return `${sign}${Math.abs(n * 100).toFixed(1).replace(".", ",")}%`;
}

function PriceAuditPanel({ breakdown }: { breakdown: QuoteBreakdownData }) {
  const [open, setOpen] = useState(false);
  const d = breakdown.distance;
  const t = breakdown.trip;
  const c = breakdown.coefficients;
  const m = breakdown.margin;
  const v = breakdown.vat;
  const totals = breakdown.totals;
  const opts = breakdown.options;

  return (
    <div style={auditWrapStyle}>
      <button style={auditToggleStyle} onClick={() => setOpen((o) => !o)} type="button">
        <span>Détail du calcul</span>
        <span style={{ fontSize: 18, lineHeight: 1 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={auditBodyStyle}>
          {d && (
            <section style={auditSectionStyle}>
              <p style={auditSectionTitleStyle}>1 — Base distance</p>
              <div style={auditRowStyle}>
                <span style={auditLabelStyle}>Mode</span>
                <span style={auditValueStyle}>
                  {d.pricingMode === "forfait_grid"
                    ? `Forfait grille (≤180 km — palier ${d.gridCeilingKm ?? "?"}km)`
                    : `Longue distance — ${d.distanceKm} km × 2 trajets × 2,50 €/km`}
                </span>
              </div>
              <div style={auditRowStyle}>
                <span style={auditLabelStyle}>Base aller simple</span>
                <span style={auditValueStyle}>{formatEur(d.oneWayBaseEur)}</span>
              </div>
              {t && (
                <div style={auditRowStyle}>
                  <span style={auditLabelStyle}>
                    {t.type === "round_trip" ? "× 2 (aller-retour)" : "Aller simple"}
                  </span>
                  <span style={{ ...auditValueStyle, fontWeight: 700 }}>
                    {formatEur(t.baseAfterTripTypeEur)}
                  </span>
                </div>
              )}
            </section>
          )}

          {c && (
            <section style={auditSectionStyle}>
              <p style={auditSectionTitleStyle}>2 — Coefficients</p>
              <div style={auditRowStyle}>
                <span style={auditLabelStyle}>Saisonnalité</span>
                <span style={{ ...auditValueStyle, color: c.seasonality >= 0 ? "#b45309" : "#15803d" }}>
                  {pct(c.seasonality)}
                </span>
              </div>
              <div style={auditRowStyle}>
                <span style={auditLabelStyle}>Délai commande</span>
                <span style={{ ...auditValueStyle, color: c.leadTime >= 0 ? "#b45309" : "#15803d" }}>
                  {pct(c.leadTime)}
                </span>
              </div>
              <div style={auditRowStyle}>
                <span style={auditLabelStyle}>Capacité véhicule</span>
                <span style={{ ...auditValueStyle, color: c.capacity >= 0 ? "#b45309" : "#15803d" }}>
                  {pct(c.capacity)}
                </span>
              </div>
              <div style={{ ...auditRowStyle, borderTop: "1px solid #d7e0ed", paddingTop: 8, marginTop: 4 }}>
                <span style={{ ...auditLabelStyle, fontWeight: 700, color: "#071b40" }}>
                  Coefficient total × {c.total.toFixed(2).replace(".", ",")}
                </span>
                <span style={{ ...auditValueStyle, fontWeight: 700 }}>
                  {c.amountEur >= 0 ? "+" : "−"}{formatEur(Math.abs(c.amountEur))}
                </span>
              </div>
            </section>
          )}

          {opts && opts.totalEur > 0 && (
            <section style={auditSectionStyle}>
              <p style={auditSectionTitleStyle}>3 — Options</p>
              {opts.tollPackageEur > 0 && (
                <div style={auditRowStyle}>
                  <span style={auditLabelStyle}>Forfait péages</span>
                  <span style={auditValueStyle}>{formatEur(opts.tollPackageEur)}</span>
                </div>
              )}
            </section>
          )}

          {m && totals && (
            <section style={auditSectionStyle}>
              <p style={auditSectionTitleStyle}>{opts && opts.totalEur > 0 ? "4" : "3"} — Marge & TVA</p>
              <div style={auditRowStyle}>
                <span style={auditLabelStyle}>Avant marge</span>
                <span style={auditValueStyle}>{formatEur(totals.beforeMarginEur)}</span>
              </div>
              <div style={auditRowStyle}>
                <span style={auditLabelStyle}>Marge {(m.rate * 100).toFixed(0)}%</span>
                <span style={{ ...auditValueStyle, color: "#b45309" }}>+{formatEur(m.amountEur)}</span>
              </div>
              <div style={{ ...auditRowStyle, borderTop: "1px solid #d7e0ed", paddingTop: 8, marginTop: 4 }}>
                <span style={{ ...auditLabelStyle, fontWeight: 700, color: "#071b40" }}>Prix HT</span>
                <span style={{ ...auditValueStyle, fontWeight: 700 }}>{formatEur(totals.priceHtEur)}</span>
              </div>
              {v && (
                <>
                  <div style={auditRowStyle}>
                    <span style={auditLabelStyle}>TVA {(v.rate * 100).toFixed(0)}%</span>
                    <span style={{ ...auditValueStyle, color: "#b45309" }}>+{formatEur(v.amountEur)}</span>
                  </div>
                  <div style={{ ...auditRowStyle, borderTop: "2px solid #071b40", paddingTop: 10, marginTop: 4 }}>
                    <span style={{ ...auditLabelStyle, fontWeight: 900, fontSize: 14, color: "#071b40" }}>Total TTC</span>
                    <span style={{ ...auditValueStyle, fontWeight: 900, fontSize: 16, color: "#071b40" }}>
                      {formatEur(totals.priceTtcEur)}
                    </span>
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const auditWrapStyle: React.CSSProperties = {
  border: "1px solid #d7e0ed",
  borderRadius: 8,
  overflow: "hidden",
};
const auditToggleStyle: React.CSSProperties = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  background: "#f0f4ff",
  border: "none",
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 700,
  color: "#071b40",
  textAlign: "left" as const,
};
const auditBodyStyle: React.CSSProperties = {
  padding: "0 16px 16px",
  display: "grid",
  gap: 0,
};
const auditSectionStyle: React.CSSProperties = {
  paddingTop: 16,
  display: "grid",
  gap: 6,
};
const auditSectionTitleStyle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: 11,
  fontWeight: 900,
  color: "#5e6b7e",
  textTransform: "uppercase" as const,
  letterSpacing: "0.06em",
};
const auditRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: 12,
  fontSize: 13,
};
const auditLabelStyle: React.CSSProperties = {
  color: "#455468",
};
const auditValueStyle: React.CSSProperties = {
  color: "#071b40",
  fontVariantNumeric: "tabular-nums",
  flexShrink: 0,
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  minHeight: 64,
  padding: "0 clamp(22px, 4vw, 58px)",
  background: "rgba(255,255,255,0.96)",
  borderBottom: "1px solid #e6edf6",
  position: "sticky",
  top: 0,
  zIndex: 20,
};
const logoStyle: React.CSSProperties = {
  color: "#0d2248",
  fontSize: 22,
  fontWeight: 900,
  textDecoration: "none",
};
const mainStyle: React.CSSProperties = {
  width: "min(680px, calc(100% - 44px))",
  margin: "40px auto 80px",
};
const cardStyle: React.CSSProperties = {
  display: "grid",
  gap: 24,
  padding: 30,
  background: "#ffffff",
  border: "1px solid #d7e0ed",
  borderRadius: 8,
  boxShadow: "0 8px 32px rgba(15,23,42,0.08)",
};
const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 20,
  flexWrap: "wrap",
};
const kickerStyle: React.CSSProperties = {
  margin: "0 0 4px",
  color: "#c49a43",
  fontSize: 12,
  fontWeight: 900,
  textTransform: "uppercase",
};
const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#071b40",
  fontSize: "clamp(22px, 2.5vw, 30px)",
  lineHeight: 1.1,
};
const priceBlockStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  flexShrink: 0,
};
const priceStyle: React.CSSProperties = {
  fontSize: 32,
  fontWeight: 900,
  color: "#071b40",
};
const priceLabelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#5e6b7e",
};
const routeStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 18px",
  background: "#f0f4ff",
  borderRadius: 8,
};
const routeCityStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 900,
  color: "#071b40",
};
const routeArrowStyle: React.CSSProperties = {
  color: "#c49a43",
  fontSize: 20,
  fontWeight: 900,
};
const detailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0,1fr))",
  gap: 14,
  margin: 0,
};
const detailItemStyle: React.CSSProperties = {
  display: "grid",
  gap: 4,
  padding: "12px 16px",
  background: "#f8fbff",
  border: "1px solid #e6edf6",
  borderRadius: 8,
};
const dtStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: "#5e6b7e",
  textTransform: "uppercase",
};
const ddStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  fontWeight: 800,
  color: "#071b40",
};
const priceBreakdownStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: "18px",
  background: "#f8fbff",
  border: "1px solid #e6edf6",
  borderRadius: 8,
};
const priceRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontSize: 14,
  color: "#455468",
};
const noticeStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 13,
  color: "#5e6b7e",
  borderTop: "1px solid #edf2f7",
  paddingTop: 16,
};
const errorStyle: React.CSSProperties = {
  padding: "20px",
  background: "#fee2e2",
  border: "1px solid #fca5a5",
  borderRadius: 8,
};
const linkStyle: React.CSSProperties = {
  color: "#123885",
  fontWeight: 700,
  fontSize: 14,
};
const ctaStyle: React.CSSProperties = {
  display: "inline-flex",
  minHeight: 44,
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  padding: "0 18px",
  background: "#123885",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 900,
  textDecoration: "none",
  justifySelf: "start" as const,
};

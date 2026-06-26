import Link from "next/link";
import Image from "next/image";
import { AccessibilityWidget } from "@/shared/accessibility/AccessibilityWidget";
import { LanguageSelector } from "@/shared/i18n/LanguageSelector";
import { getLeadDetail } from "@/features/lead-detail/services/getLeadDetail";
import { getQuoteById } from "../services/getQuoteById";
import { QuoteClientActions } from "./QuoteClientActions";
import styles from "./quote-client.module.css";

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", { currency: "EUR", style: "currency" }).format(value);
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "A confirmer";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function formatTripDates(departureDate: string | null | undefined, returnDate: string | null | undefined) {
  const departure = formatDate(departureDate);
  if (!returnDate) return departure;

  return `${departure} - retour ${formatDate(returnDate)}`;
}

function formatTripType(value: string | null | undefined) {
  if (value === "round_trip") return "Aller-retour";
  if (value === "one_way") return "Aller simple";

  return "A confirmer";
}

function formatTraceabilityParts(value: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";

  return {
    date: `${part("day")}/${part("month")}/${part("year")}`,
    time: `${part("hour")}:${part("minute")}`
  };
}

function traceabilityReference(value: Date) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Paris",
    year: "numeric"
  }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "00";

  return `NTV-${part("year")}${part("month")}${part("day")}-${part("hour")}${part("minute")}`;
}

function pricingEngineLabel(matrixVersion: string) {
  const version = matrixVersion.match(/v\d+/i)?.[0] ?? matrixVersion;
  return `NeoTravel Pricing Engine ${version}`;
}

export async function QuoteClientView({ quoteId }: { quoteId: string }) {
  const storedQuote = await getQuoteById(quoteId);
  const lead = storedQuote ? await getLeadDetail(storedQuote.leadId) : null;

  if (!storedQuote) {
    return (
      <main className={styles.page}>
        <section className={styles.notFound}>
          <h1>Devis introuvable</h1>
          <p>La reference demandee ne correspond a aucun devis conserve.</p>
          <Link href="/">Retour accueil</Link>
        </section>
      </main>
    );
  }

  const calculation = storedQuote.calculation;
  const generatedAt = new Date();
  const traceabilityDate = formatTraceabilityParts(generatedAt);
  const traceabilityId = traceabilityReference(generatedAt);
  const engineLabel = pricingEngineLabel(calculation.breakdown.matrixVersion);
  const clientName = lead?.organization ?? "Client particulier / organisation";
  const clientEmail = lead?.email ?? "Email a confirmer";
  const passengerLabel = lead?.passengerCount ? `${lead.passengerCount} passagers` : "A confirmer";
  const tripDates = formatTripDates(lead?.departureDate, lead?.returnDate);
  const routeLabel =
    lead?.departureCity && lead?.arrivalCity
      ? `${lead.departureCity} -> ${lead.arrivalCity}`
      : calculation.breakdown.routeLabel;
  const options = lead?.options.length
    ? lead.options
    : calculation.breakdown.options.map((option) => option.label);

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link className={styles.logo} href="/" aria-label="NeoTravel accueil">
          <Image src="/logo-neotravel-v12.svg" alt="" width={250} height={72} priority />
        </Link>

        <div className={styles.topActions}>
          <nav className={styles.nav} aria-label="Parcours client">
            <Link href="/demande" data-i18n-key="Conversation">Conversation</Link>
            <span data-i18n-key="Devis">Devis</span>
            <Link href="/contact" data-i18n-key="Contact">Contact</Link>
          </nav>
          <LanguageSelector />
          <AccessibilityWidget />
        </div>
      </header>

      <section className={styles.pageIntro}>
        <h1 data-i18n-key="Mon devis NeoTravel">Mon devis NeoTravel</h1>
        <span aria-hidden="true">↓</span>
      </section>

      <div className={styles.documentLayout}>
        <article className={styles.shell}>
          <div className={styles.paperBars} aria-hidden="true">
            <span className={styles.redBar} />
            <span className={styles.goldBar} />
            <span className={styles.blueBar} />
          </div>

          <header className={styles.pdfHeader}>
            <Link className={styles.pdfLogo} href="/" aria-label="NeoTravel accueil">
              <span className={styles.logoShield}>N</span>
              <span>
                <strong>
                  Neo <em>Travel</em>
                </strong>
                <small data-i18n-key="Transport de voyageurs - devis client">
                  Transport de voyageurs - devis client
                </small>
              </span>
            </Link>
            <div className={styles.reference}>
              <strong>DEVIS</strong>
              <span>N° {calculation.quoteNumber}</span>
            </div>
          </header>

          <section className={styles.metaStrip} aria-label="Informations devis">
            <div>
              <span data-i18n-key="Date emission">Date emission</span>
              <strong>{generatedAt.toLocaleDateString("fr-FR")}</strong>
            </div>
            <div>
              <span data-i18n-key="Validite offre">Validite offre</span>
              <strong data-i18n-key="7 jours">7 jours</strong>
            </div>
            <div>
              <span data-i18n-key="Statut IA">Statut IA</span>
              <strong data-i18n-key="Regles metier validees">Regles metier validees</strong>
            </div>
            <div>
              <span data-i18n-key="Canal envoi">Canal envoi</span>
              <strong>Email</strong>
            </div>
          </section>

          <div className={styles.partiesGrid}>
            <section className={styles.partyBox}>
              <h2 data-i18n-key="Emetteur">Emetteur</h2>
              <p>NeoTravel SAS</p>
              <p data-i18n-key="Transport de voyageurs">Transport de voyageurs</p>
              <p>contact@neotravel.fr</p>
            </section>
            <section className={styles.partyBox}>
              <h2 data-i18n-key="Client">Client</h2>
              <p>{clientName}</p>
              <p>
                <span data-i18n-key="Email : ">Email : </span>
                {clientEmail}
              </p>
              <p>
                <span data-i18n-key="Reference demande : ">Reference demande : </span>
                {storedQuote.leadId}
              </p>
            </section>
          </div>

          <section className={styles.tripBox} aria-labelledby="quote-details">
            <h2 id="quote-details" data-i18n-key="Prestation demandee">Prestation demandee</h2>
            <div className={styles.tripGrid}>
              <div>
                <span data-i18n-key="Trajet">Trajet</span>
                <strong>{routeLabel}</strong>
              </div>
              <div>
                <span data-i18n-key="Date et horaires">Date et horaires</span>
                <strong>{tripDates} - horaires a confirmer</strong>
              </div>
              <div>
                <span data-i18n-key="Passagers">Passagers</span>
                <strong>{passengerLabel}</strong>
              </div>
              <div>
                <span data-i18n-key="Type de trajet">Type de trajet</span>
                <strong>{formatTripType(lead?.tripType)}</strong>
              </div>
              <div>
                <span data-i18n-key="Vehicule">Vehicule</span>
                <strong data-i18n-key={calculation.breakdown.vehicleLabel}>{calculation.breakdown.vehicleLabel}</strong>
              </div>
              <div>
                <span data-i18n-key="Distance">Distance</span>
                <strong>{calculation.distanceKm} km</strong>
              </div>
            </div>
            <div className={styles.optionChips}>
              {(options.length ? options : ["Aucune option ajoutee"]).map((option) => (
                <span key={option} data-i18n-key={option}>{option}</span>
              ))}
            </div>
          </section>

          <section className={styles.breakdown} aria-labelledby="price-breakdown">
            <h2 id="price-breakdown" data-i18n-key="Detail estimatif">Detail estimatif</h2>
            <div className={styles.priceTable}>
              <div className={styles.priceHead}>
                <span data-i18n-key="Designation">Designation</span>
                <span data-i18n-key="Qte">Qte</span>
                <span data-i18n-key="Prix HT">Prix HT</span>
                <span>TVA</span>
                <span data-i18n-key="Total TTC">Total TTC</span>
              </div>
              {calculation.lines.map((line) => (
                <div className={styles.priceLine} key={line.label}>
                  <span data-i18n-key={line.label}>{line.label}</span>
                  <span>1</span>
                  <span>{formatEuro(line.amount)}</span>
                  <span>{formatPercent(calculation.vatRate)}</span>
                  <strong>{formatEuro(line.amount + line.amount * calculation.vatRate)}</strong>
                </div>
              ))}
            </div>

            <div className={styles.validationAndTotals}>
              <div className={styles.validationBox}>
                <h3 data-i18n-key="Traçabilité du devis">Traçabilité du devis</h3>
                <p>
                  <span data-i18n-key="Calcul réalisé le : ">Calcul réalisé le : </span>
                  {traceabilityDate.date}
                  <span data-i18n-key=" à "> à </span>
                  {traceabilityDate.time}
                </p>
                <p>
                  <span data-i18n-key="Moteur : ">Moteur : </span>
                  {engineLabel}
                </p>
                <p>
                  <span data-i18n-key="Référence : ">Référence : </span>
                  {traceabilityId}
                </p>
                <p data-i18n-key="Devis généré automatiquement selon les règles métier NeoTravel, sous réserve de validation opérationnelle.">
                  Devis généré automatiquement selon les règles métier NeoTravel, sous réserve de validation
                  opérationnelle.
                </p>
              </div>
              <div className={styles.totalsBox}>
                <div>
                  <span data-i18n-key="Total HT">Total HT</span>
                  <strong>{formatEuro(calculation.priceHt)}</strong>
                </div>
                <div>
                  <span data-i18n-key="TVA estimee">TVA estimee</span>
                  <strong>{formatEuro(calculation.vatAmount)}</strong>
                </div>
                <div>
                  <span data-i18n-key="Total TTC">Total TTC</span>
                  <strong>{formatEuro(calculation.priceTtc)}</strong>
                </div>
                <p data-i18n-key="Montant a confirmer apres disponibilite finale">
                  Montant a confirmer apres disponibilite finale
                </p>
              </div>
            </div>
          </section>

          <section className={styles.conditionsBox}>
            <h2 data-i18n-key="Conditions et acceptation">Conditions et acceptation</h2>
            <p data-i18n-key="Offre valable sous reserve de disponibilite partenaires et chauffeur. Le devis devient contractuel apres signature electronique ou accord ecrit du client. Ce document est un devis, pas une facture.">
              Offre valable sous reserve de disponibilite partenaires et chauffeur. Le devis devient contractuel apres
              signature electronique ou accord ecrit du client. Ce document est un devis, pas une facture.
            </p>
          </section>

          <div className={styles.signatureGrid}>
            <div>
              <h3 data-i18n-key="Bon pour accord client">Bon pour accord client</h3>
              <span data-i18n-key="Date, nom et signature electronique">Date, nom et signature electronique</span>
            </div>
            <div>
              <h3 data-i18n-key="Validation NeoTravel">Validation NeoTravel</h3>
              <p data-i18n-key="Genere automatiquement apres validation regles metier.">
                Genere automatiquement apres validation regles metier.
              </p>
            </div>
          </div>

          <QuoteClientActions quoteId={quoteId} initialStatus={storedQuote.status} />
        </article>
      </div>
    </main>
  );
}

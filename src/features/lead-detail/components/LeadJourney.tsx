import type { Lead } from "@/shared/types/lead";
import type { JourneyEvent } from "../services/getLeadTimeline";
import styles from "./leadJourney.module.css";

const STAGES = ["Reçue", "Qualification", "Devis", "Envoyé", "Clôturé"] as const;

// Maps a lead status to the furthest stage it has reached (index into STAGES).
function stageIndexFor(status: string): number {
  switch (status) {
    case "NEW":
      return 0;
    case "INCOMPLETE":
    case "QUALIFIED":
    case "HIGH_VALUE":
    case "HUMAN_REVIEW":
      return 1;
    case "QUOTE_READY":
      return 2;
    case "QUOTE_SENT":
    case "FOLLOWUP_SCHEDULED":
    case "FOLLOWUP_1":
    case "FOLLOWUP_2":
      return 3;
    case "WON":
    case "LOST":
    case "CLOSED":
      return 4;
    default:
      return 0;
  }
}

function euro(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function dateOnly(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

function dateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function tripTypeLabel(value: string | null | undefined): string {
  if (value === "one_way") return "Aller simple";
  if (value === "round_trip") return "Aller-retour";
  return "—";
}

export function LeadJourney({
  lead,
  timeline,
  quoteId,
  quoteAmountTtc,
}: {
  lead: Lead;
  timeline: JourneyEvent[];
  quoteId: string | null;
  quoteAmountTtc: number | null;
}) {
  const currentStage = stageIndexFor(lead.status);
  const isLost = lead.status === "LOST";
  const isHumanReview = lead.status === "HUMAN_REVIEW";

  return (
    <div className={styles.journey}>
      {/* Stage progress — where the lead sits in the pipeline */}
      <ol className={styles.stages} aria-label="Étapes du parcours">
        {STAGES.map((stage, index) => {
          const state =
            index < currentStage ? "done" : index === currentStage ? "current" : "upcoming";
          return (
            <li key={stage} className={styles.stage} data-state={state} data-lost={isLost && index === 4}>
              <span className={styles.stageDot}>{index + 1}</span>
              <span className={styles.stageLabel}>
                {index === 4 && isLost ? "Perdu" : index === 4 && lead.status === "WON" ? "Gagné" : stage}
              </span>
            </li>
          );
        })}
      </ol>

      {isHumanReview ? (
        <p className={styles.reviewBanner}>
          ⚠ En validation humaine{lead.humanReviewReason ? ` — ${lead.humanReviewReason}` : ""}. Aucun
          devis automatique tant qu&apos;un conseiller n&apos;a pas tranché.
        </p>
      ) : null}

      <div className={styles.columns}>
        {/* Lead facts — the real data */}
        <section className={styles.facts} aria-label="Informations de la demande">
          <h2>Demande</h2>
          <dl>
            <div>
              <dt>Client</dt>
              <dd>{lead.organization ?? lead.email ?? "—"}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{lead.email ?? "—"}</dd>
            </div>
            <div>
              <dt>Trajet</dt>
              <dd>
                {(lead.departureCity ?? "—") + " → " + (lead.arrivalCity ?? "—")}
                <small>{tripTypeLabel(lead.tripType)}</small>
              </dd>
            </div>
            <div>
              <dt>Date de départ</dt>
              <dd>{dateOnly(lead.departureDate)}</dd>
            </div>
            {lead.tripType === "round_trip" ? (
              <div>
                <dt>Date de retour</dt>
                <dd>{dateOnly(lead.returnDate)}</dd>
              </div>
            ) : null}
            <div>
              <dt>Passagers</dt>
              <dd>{lead.passengerCount ?? "—"}</dd>
            </div>
            <div>
              <dt>Devis</dt>
              <dd>
                {quoteAmountTtc != null && quoteId ? (
                  <a href={`/client/devis/${quoteId}`}>{euro(quoteAmountTtc)} TTC</a>
                ) : (
                  "—"
                )}
              </dd>
            </div>
            {lead.status === "INCOMPLETE" && lead.missingFields?.length ? (
              <div>
                <dt>Champs manquants</dt>
                <dd className={styles.warn}>{lead.missingFields.join(", ")}</dd>
              </div>
            ) : null}
            {lead.humanReviewReason ? (
              <div>
                <dt>Raison validation</dt>
                <dd className={styles.warn}>{lead.humanReviewReason}</dd>
              </div>
            ) : null}
            {lead.humanReviewNotes ? (
              <div>
                <dt>Notes</dt>
                <dd>{lead.humanReviewNotes}</dd>
              </div>
            ) : null}
          </dl>
        </section>

        {/* Parcours — real audit timeline */}
        <section className={styles.timeline} aria-label="Parcours de la demande">
          <h2>Parcours</h2>
          {timeline.length === 0 ? (
            <p className={styles.empty}>Aucun événement tracé pour cette demande.</p>
          ) : (
            <ol className={styles.events}>
              {timeline.map((event) => (
                <li key={event.id} className={styles.event} data-entity={event.entityType}>
                  <span className={styles.eventDot} aria-hidden="true" />
                  <div className={styles.eventBody}>
                    <strong>{event.label}</strong>
                    {event.detail ? <span className={styles.eventDetail}>{event.detail}</span> : null}
                    <time className={styles.eventTime}>{dateTime(event.at)}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

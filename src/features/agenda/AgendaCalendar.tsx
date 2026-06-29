"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import dashStyles from "@/features/dashboard/components/dashboard.module.css";
import styles from "./agenda.module.css";
import type { AgendaEvent, AgendaTodo } from "./agendaEvents";

type ViewMode = "month" | "week" | "day";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const WEEKDAYS_LONG = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const TYPE_LABEL: Record<AgendaEvent["type"], string> = {
  relance: "Relance",
  depart: "Départ",
  review: "À valider"
};

const VIEWS: Array<{ id: ViewMode; label: string; icon: typeof LayoutGrid }> = [
  { id: "month", label: "Mois", icon: LayoutGrid },
  { id: "week", label: "Semaine", icon: CalendarRange },
  { id: "day", label: "Jour", icon: CalendarDays }
];

function fmt(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDay(key: string) {
  return new Date(`${key}T12:00:00`);
}

function startOfWeek(date: Date) {
  const start = new Date(date);
  start.setHours(12, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function buildMonthGrid(year: number, month: number) {
  const start = new Date(year, month, 1);
  start.setDate(1 - ((start.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

function buildWeekDays(anchor: Date) {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
}

function formatDayTitle(date: Date) {
  const weekday = WEEKDAYS_LONG[(date.getDay() + 6) % 7];
  return `${weekday} ${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function formatWeekTitle(weekDays: Date[]) {
  const start = weekDays[0];
  const end = weekDays[6];
  const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long" });
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()} – ${end.getDate()} ${monthFmt.format(start)} ${start.getFullYear()}`;
  }
  const short = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  return `${short.format(start)} – ${short.format(end)} ${end.getFullYear()}`;
}

function initialAnchor(events: AgendaEvent[]) {
  const now = new Date();
  const todayKey = fmt(now);
  const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const target = sorted.find((event) => event.date >= todayKey) ?? sorted[0];
  return target ? parseDay(target.date) : now;
}

function EventChip({ event }: { event: AgendaEvent }) {
  return (
    <Link
      href={event.href}
      className={styles.chip}
      data-type={event.type}
      title={`${TYPE_LABEL[event.type]} · ${event.subtitle ?? ""}`}
    >
      <span className={styles.chipType}>{TYPE_LABEL[event.type]}</span>
      <span className={styles.chipText}>{event.subtitle ?? event.title}</span>
    </Link>
  );
}

function DayEventsList({ events, emptyLabel }: { events: AgendaEvent[]; emptyLabel: string }) {
  if (events.length === 0) {
    return <p className={styles.emptyDay}>{emptyLabel}</p>;
  }

  return (
    <ul className={styles.dayEventList}>
      {events.map((event) => (
        <li key={event.id}>
          <Link href={event.href} className={styles.dayEventCard} data-type={event.type}>
            <span className={styles.dot} data-type={event.type} aria-hidden="true" />
            <span className={styles.dayEventBody}>
              <strong>{event.subtitle ?? event.title}</strong>
              <small>
                {TYPE_LABEL[event.type]} · {event.title}
              </small>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AgendaCalendar({ events, todos }: { events: AgendaEvent[]; todos: AgendaTodo[] }) {
  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState(() => initialAnchor(events));

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const todayKey = fmt(today);
  const anchorKey = fmt(anchor);
  const weekDays = useMemo(() => buildWeekDays(anchor), [anchor]);
  const monthGrid = useMemo(() => buildMonthGrid(anchor.getFullYear(), anchor.getMonth()), [anchor]);

  const upcoming = useMemo(() => events.filter((event) => event.date >= todayKey).slice(0, 8), [events, todayKey]);

  const periodTitle =
    view === "month"
      ? `${MONTHS[anchor.getMonth()]} ${anchor.getFullYear()}`
      : view === "week"
        ? `Semaine du ${formatWeekTitle(weekDays)}`
        : formatDayTitle(anchor);

  function shift(delta: number) {
    setAnchor((prev) => {
      const next = new Date(prev);
      if (view === "month") next.setMonth(prev.getMonth() + delta);
      else if (view === "week") next.setDate(prev.getDate() + delta * 7);
      else next.setDate(prev.getDate() + delta);
      return next;
    });
  }

  function goToday() {
    setAnchor(new Date());
  }

  function openDay(date: Date) {
    setAnchor(date);
    setView("day");
  }

  const navLabel =
    view === "month" ? (delta: number) => (delta < 0 ? "Mois précédent" : "Mois suivant") : view === "week" ? (delta: number) => (delta < 0 ? "Semaine précédente" : "Semaine suivante") : (delta: number) => (delta < 0 ? "Jour précédent" : "Jour suivant");

  return (
    <main className={dashStyles.page}>
      <header className={dashStyles.header}>
        <div>
          <p className={dashStyles.eyebrow}>Agenda</p>
          <h1>Agenda automatisé</h1>
          <p>
            Alimenté automatiquement : relances, départs et validations. Affichage par mois, semaine ou jour.
          </p>
        </div>
        <div className={dashStyles.headerActions}>
          <button type="button" className={dashStyles.secondary} onClick={goToday}>
            Aujourd&apos;hui
          </button>
        </div>
      </header>

      <div className={styles.layout}>
        <section className={styles.calendarCard}>
          <div className={styles.calToolbar}>
            <div className={styles.viewTabs} role="tablist" aria-label="Mode d'affichage">
              {VIEWS.map((item) => {
                const Icon = item.icon;
                const selected = view === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    className={styles.viewTab}
                    data-active={selected ? "true" : undefined}
                    onClick={() => setView(item.id)}
                  >
                    <Icon size={15} aria-hidden="true" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className={styles.calHeader}>
              <button type="button" className={styles.navBtn} onClick={() => shift(-1)} aria-label={navLabel(-1)}>
                <ChevronLeft size={18} />
              </button>
              <strong>{periodTitle}</strong>
              <button type="button" className={styles.navBtn} onClick={() => shift(1)} aria-label={navLabel(1)}>
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {view === "month" ? (
            <>
              <div className={styles.weekRow}>
                {WEEKDAYS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>
              <div className={styles.grid}>
                {monthGrid.map((date) => {
                  const key = fmt(date);
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const outside = date.getMonth() !== anchor.getMonth();

                  return (
                    <div
                      key={key}
                      className={styles.cell}
                      data-outside={outside ? "true" : undefined}
                      data-today={key === todayKey ? "true" : undefined}
                    >
                      <button
                        type="button"
                        className={styles.dayNumBtn}
                        onClick={() => openDay(date)}
                        aria-label={`Voir le ${formatDayTitle(date)}`}
                      >
                        {date.getDate()}
                      </button>
                      <div className={styles.cellEvents}>
                        {dayEvents.slice(0, 3).map((event) => (
                          <EventChip key={event.id} event={event} />
                        ))}
                        {dayEvents.length > 3 ? <span className={styles.more}>+{dayEvents.length - 3}</span> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {view === "week" ? (
            <>
              <div className={styles.weekRow}>
                {weekDays.map((date) => {
                  const key = fmt(date);
                  return (
                    <span key={key} data-today={key === todayKey ? "true" : undefined}>
                      <em>{WEEKDAYS[(date.getDay() + 6) % 7]}</em>
                      <b>{date.getDate()}</b>
                    </span>
                  );
                })}
              </div>
              <div className={styles.weekGrid}>
                {weekDays.map((date) => {
                  const key = fmt(date);
                  const dayEvents = eventsByDay.get(key) ?? [];

                  return (
                    <div
                      key={key}
                      className={styles.weekCell}
                      data-today={key === todayKey ? "true" : undefined}
                    >
                      <button type="button" className={styles.weekCellHead} onClick={() => openDay(date)}>
                        {dayEvents.length} événement{dayEvents.length > 1 ? "s" : ""}
                      </button>
                      <div className={styles.weekCellEvents}>
                        {dayEvents.map((event) => (
                          <EventChip key={event.id} event={event} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {view === "day" ? (
            <div className={styles.dayView}>
              <div className={styles.dayViewHead} data-today={anchorKey === todayKey ? "true" : undefined}>
                <span>{WEEKDAYS_LONG[(anchor.getDay() + 6) % 7]}</span>
                <strong>{anchor.getDate()}</strong>
                <small>
                  {MONTHS[anchor.getMonth()]} {anchor.getFullYear()}
                </small>
              </div>
              <DayEventsList
                events={eventsByDay.get(anchorKey) ?? []}
                emptyLabel="Aucun événement planifié ce jour."
              />
            </div>
          ) : null}

          <div className={styles.legend}>
            <span className={styles.legendItem} data-type="relance">
              Relance
            </span>
            <span className={styles.legendItem} data-type="depart">
              Départ
            </span>
            <span className={styles.legendItem} data-type="review">
              À valider
            </span>
          </div>
        </section>

        <aside className={styles.side}>
          <section className={styles.sideCard}>
            <h2>Prochains rendez-vous</h2>
            {upcoming.length === 0 ? (
              <p className={styles.empty}>Aucun événement à venir.</p>
            ) : (
              <ul className={styles.eventList}>
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <Link href={event.href}>
                      <span className={styles.dot} data-type={event.type} aria-hidden="true" />
                      <span className={styles.eventMeta}>
                        <strong>{event.subtitle ?? event.title}</strong>
                        <small>
                          {TYPE_LABEL[event.type]} ·{" "}
                          {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
                            parseDay(event.date)
                          )}
                        </small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.sideCard}>
            <h2>À traiter</h2>
            {todos.length === 0 ? (
              <p className={styles.empty}>Rien à traiter, tout est à jour.</p>
            ) : (
              <ul className={styles.todoList}>
                {todos.map((todo) => (
                  <li key={todo.leadId}>
                    <Link href={todo.href}>
                      <strong>{todo.label}</strong>
                      <StatusBadge status={todo.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

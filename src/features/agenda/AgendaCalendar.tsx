"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/features/dashboard/components/StatusBadge";
import dashStyles from "@/features/dashboard/components/dashboard.module.css";
import styles from "./agenda.module.css";
import type { AgendaEvent, AgendaTodo } from "./agendaEvents";

type AgendaViewMode = "day" | "month" | "year";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTHS = [
 "Janvier",
 "Fevrier",
 "Mars",
 "Avril",
 "Mai",
 "Juin",
 "Juillet",
 "Aout",
 "Septembre",
 "Octobre",
 "Novembre",
 "Decembre"
];

const TYPE_LABEL: Record<AgendaEvent["type"], string> = {
 relance: "Relance",
 depart: "Depart",
 review: "A valider"
};

function fmt(date: Date) {
 const y = date.getFullYear();
 const m = String(date.getMonth() + 1).padStart(2, "0");
 const d = String(date.getDate()).padStart(2, "0");
 return `${y}-${m}-${d}`;
}

function buildGrid(year: number, month: number) {
 const start = new Date(year, month, 1);
 start.setDate(1 - ((start.getDay() + 6) % 7));
 return Array.from({ length: 42 }, (_, i) => {
  const date = new Date(start);
  date.setDate(start.getDate() + i);
  return date;
 });
}

function getInitialAgendaDate(events: AgendaEvent[]) {
 const now = new Date();
 const todayKey = fmt(now);
 const sorted = [...events].sort((a, b) => a.date.localeCompare(b.date));
 const target = sorted.find((event) => event.date >= todayKey) ?? sorted[0];

 return target ? new Date(`${target.date}T00:00:00`) : now;
}

function formatDayLabel(value: string) {
 return new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric"
 }).format(new Date(`${value}T12:00:00`));
}

export function AgendaCalendar({ events, todos }: { events: AgendaEvent[]; todos: AgendaTodo[] }) {
 const today = new Date();
 const [cursor, setCursor] = useState(() => {
  const base = getInitialAgendaDate(events);
  return { year: base.getFullYear(), month: base.getMonth() };
 });
 const [selectedDate, setSelectedDate] = useState<string | null>(null);
 const [viewMode, setViewMode] = useState<AgendaViewMode>("month");

 const eventsByDay = useMemo(() => {
  const map = new Map<string, AgendaEvent[]>();
  for (const event of events) {
   const list = map.get(event.date) ?? [];
   list.push(event);
   map.set(event.date, list);
  }
  return map;
 }, [events]);

 const grid = useMemo(() => buildGrid(cursor.year, cursor.month), [cursor]);
 const todayKey = fmt(today);
 const selectedEvents = selectedDate ? eventsByDay.get(selectedDate) ?? [] : [];
 const yearMonths = useMemo(() => {
  return Array.from({ length: 12 }, (_, month) => ({
   month,
   days: buildGrid(cursor.year, month)
  }));
 }, [cursor.year]);

 const upcoming = useMemo(() => {
  return events.filter((event) => event.date >= todayKey).slice(0, 8);
 }, [events, todayKey]);

 function shift(delta: number) {
  if (viewMode === "day" && selectedDate) {
   const date = new Date(`${selectedDate}T12:00:00`);
   date.setDate(date.getDate() + delta);
   setSelectedDate(fmt(date));
   setCursor({ year: date.getFullYear(), month: date.getMonth() });
   return;
  }

  if (viewMode === "year") {
   setCursor((prev) => ({ year: prev.year + delta, month: prev.month }));
   return;
  }

  setCursor((prev) => {
   const date = new Date(prev.year, prev.month + delta, 1);
   return { year: date.getFullYear(), month: date.getMonth() };
  });
 }

 function goToday() {
  setCursor({ year: today.getFullYear(), month: today.getMonth() });
  setSelectedDate(viewMode === "day" ? todayKey : null);
 }

 function openDay(key: string) {
  const date = new Date(`${key}T12:00:00`);
  setSelectedDate(key);
  setCursor({ year: date.getFullYear(), month: date.getMonth() });
  setViewMode("day");
 }

 function openMonth(month: number) {
  setSelectedDate(null);
  setCursor((prev) => ({ year: prev.year, month }));
  setViewMode("month");
 }

 function changeView(mode: AgendaViewMode) {
  if (mode === "day" && !selectedDate) {
   setSelectedDate(todayKey);
   setCursor({ year: today.getFullYear(), month: today.getMonth() });
  }

  if (mode !== "day") {
   setSelectedDate(null);
  }

  setViewMode(mode);
 }

 return (
  <main className={dashStyles.page}>
   <header className={dashStyles.header}>
    <div>
     <p className={dashStyles.eyebrow}>Agenda</p>
     <h1>Agenda automatise</h1>
     <p>
      Alimente automatiquement par les actions du systeme : relances planifiees, departs prevus et demandes a
      valider. Aucune saisie manuelle.
     </p>
    </div>
    <div className={dashStyles.headerActions}>
     <div className={styles.viewSwitch} aria-label="Vue agenda">
      <button type="button" data-active={viewMode === "day" ? "true" : undefined} onClick={() => changeView("day")}>
       Jour
      </button>
      <button
       type="button"
       data-active={viewMode === "month" ? "true" : undefined}
       onClick={() => changeView("month")}
      >
       Mois
      </button>
      <button
       type="button"
       data-active={viewMode === "year" ? "true" : undefined}
       onClick={() => changeView("year")}
      >
       Annee
      </button>
     </div>
    </div>
   </header>

   <div className={styles.layout}>
    <section className={styles.calendarCard}>
     <div className={styles.calHeader}>
      <button
       type="button"
       className={styles.navBtn}
       onClick={() => shift(-1)}
       aria-label={viewMode === "day" ? "Jour precedent" : viewMode === "year" ? "Annee precedente" : "Mois precedent"}
      >
       <ChevronLeft size={18} />
      </button>
      <div className={styles.calTitle}>
       <strong>
        {viewMode === "day" && selectedDate
         ? formatDayLabel(selectedDate)
         : viewMode === "year"
          ? cursor.year
          : `${MONTHS[cursor.month]} ${cursor.year}`}
       </strong>
       <button type="button" className={styles.todayButton} onClick={goToday}>
        <CalendarDays size={14} aria-hidden="true" />
        Aujourd&apos;hui
       </button>
      </div>
      <button
       type="button"
       className={styles.navBtn}
       onClick={() => shift(1)}
       aria-label={viewMode === "day" ? "Jour suivant" : viewMode === "year" ? "Annee suivante" : "Mois suivant"}
      >
       <ChevronRight size={18} />
      </button>
     </div>

     {viewMode === "day" && selectedDate ? (
      <section className={styles.dayView} aria-labelledby="selected-day-title">
       <div className={styles.dayViewHeader}>
        <button type="button" className={styles.backButton} onClick={() => changeView("month")}>
         Retour au mois
        </button>
        <span>
         {selectedEvents.length} evenement{selectedEvents.length > 1 ? "s" : ""}
        </span>
       </div>

       <h2 id="selected-day-title" className={styles.srOnly}>
        {formatDayLabel(selectedDate)}
       </h2>

       {selectedEvents.length === 0 ? (
        <p className={styles.emptyDay}>Aucun evenement programme ce jour.</p>
       ) : (
        <ul className={styles.dayEventList}>
         {selectedEvents.map((event) => (
          <li key={event.id}>
           <Link href={event.href}>
            <span className={styles.dot} data-type={event.type} aria-hidden="true" />
            <span>
             <strong>{event.subtitle ?? event.title}</strong>
             <small>
              {TYPE_LABEL[event.type]} - {event.title}
             </small>
            </span>
           </Link>
          </li>
         ))}
        </ul>
       )}
      </section>
     ) : viewMode === "year" ? (
      <div className={styles.yearGrid}>
       {yearMonths.map(({ month, days }) => (
        <section className={styles.yearMonth} key={month} aria-label={`${MONTHS[month]} ${cursor.year}`}>
         <button type="button" className={styles.yearMonthTitle} onClick={() => openMonth(month)}>
          {MONTHS[month]}
         </button>
         <div className={styles.miniWeekRow}>
          {WEEKDAYS.map((day) => (
           <span key={`${month}-${day}`}>{day.slice(0, 1)}</span>
          ))}
         </div>
         <div className={styles.miniGrid}>
          {days.map((date) => {
           const key = fmt(date);
           const dayEvents = eventsByDay.get(key) ?? [];
           const outside = date.getMonth() !== month;

           return (
            <button
             key={`${month}-${key}`}
             type="button"
             className={styles.miniDay}
             data-outside={outside ? "true" : undefined}
             data-today={key === todayKey ? "true" : undefined}
             onClick={() => openDay(key)}
             aria-label={`Ouvrir le ${formatDayLabel(key)}`}
            >
             <span>{date.getDate()}</span>
             {dayEvents.length ? <span className={styles.miniDots} aria-hidden="true" /> : null}
            </button>
           );
          })}
         </div>
        </section>
       ))}
      </div>
     ) : (
      <>
       <div className={styles.weekRow}>
        {WEEKDAYS.map((day) => (
         <span key={day}>{day}</span>
        ))}
       </div>

       <div className={styles.grid}>
        {grid.map((date) => {
         const key = fmt(date);
         const dayEvents = eventsByDay.get(key) ?? [];
         const outside = date.getMonth() !== cursor.month;

         return (
          <button
           key={key}
           type="button"
           className={styles.cell}
           data-outside={outside ? "true" : undefined}
           data-today={key === todayKey ? "true" : undefined}
           onClick={() => openDay(key)}
           aria-label={`Ouvrir le ${formatDayLabel(key)}`}
          >
           <span className={styles.dayNum}>{date.getDate()}</span>
           <span className={styles.cellEvents}>
            {dayEvents.slice(0, 3).map((event) => (
             <span
              key={event.id}
              className={styles.chip}
              data-type={event.type}
              title={`${TYPE_LABEL[event.type]} - ${event.subtitle ?? ""}`}
             >
              {event.subtitle ?? event.title}
             </span>
            ))}
            {dayEvents.length > 3 ? <span className={styles.more}>+{dayEvents.length - 3}</span> : null}
           </span>
          </button>
         );
        })}
       </div>

       <div className={styles.legend}>
        <span className={styles.legendItem} data-type="relance">
         Relance
        </span>
        <span className={styles.legendItem} data-type="depart">
         Depart
        </span>
        <span className={styles.legendItem} data-type="review">
         A valider
        </span>
       </div>
      </>
     )}
    </section>

    <aside className={styles.side}>
     <section className={styles.sideCard}>
      <h2>Prochains rendez-vous</h2>
      {upcoming.length === 0 ? (
       <p className={styles.empty}>Aucun evenement a venir.</p>
      ) : (
       <ul className={styles.eventList}>
        {upcoming.map((event) => (
         <li key={event.id}>
          <Link href={event.href}>
           <span className={styles.dot} data-type={event.type} aria-hidden="true" />
           <span className={styles.eventMeta}>
            <strong>{event.subtitle ?? event.title}</strong>
            <small>
             {TYPE_LABEL[event.type]} -{" "}
             {new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
              new Date(`${event.date}T12:00:00`)
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
      <h2>A traiter</h2>
      {todos.length === 0 ? (
       <p className={styles.empty}>Rien a traiter, tout est a jour.</p>
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

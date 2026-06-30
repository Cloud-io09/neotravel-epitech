import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import styles from "./dashboard.module.css";
import { DashboardSearch } from "./DashboardSearch";

type Kpi = {
 label: string;
 value: string | number;
 tone?: "blue" | "gold" | "red" | "green";
 href?: string;
};

type TableRow = {
 cells: ReactNode[];
 href?: string;
 tone?: "review" | "won" | "danger";
};

type TableColumn =
 | string
 | {
    label: string;
    href: string;
    active?: boolean;
    direction?: "asc" | "desc";
   };

const toneColor = {
 blue: "#123885",
 gold: "#dba23e",
 red: "#d51b29",
 green: "#0b8554"
};

export function DashboardHeader({
 title,
 subtitle,
 actionHref,
 actionLabel
}: {
 title: string;
 subtitle: string;
 actionHref?: string;
 actionLabel?: string;
}) {
 return (
  <header className={styles.header}>
   <div>
    <p className={styles.eyebrow}>Dashboard NeoTravel</p>
    <h1>{title}</h1>
    <p>{subtitle}</p>
   </div>
   <div className={styles.headerActions}>
    <DashboardSearch />
    {actionHref && actionLabel ? (
     <Link className={styles.primary} href={actionHref}>
      {actionLabel}
     </Link>
    ) : null}
   </div>
  </header>
 );
}

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
 return (
  <section className={styles.kpiGrid} aria-label="Indicateurs">
   {kpis.map((kpi) => {
    const content = (
     <>
      <strong style={{ color: kpi.tone ? toneColor[kpi.tone] : undefined }}>{kpi.value}</strong>
      <span>{kpi.label}</span>
     </>
    );

    return kpi.href ? (
     <Link className={styles.kpi} href={kpi.href} key={kpi.label} data-dash-searchable="">
      {content}
     </Link>
    ) : (
     <article className={styles.kpi} key={kpi.label} data-dash-searchable="">
      {content}
     </article>
    );
   })}
  </section>
 );
}

export function Panel({
 title,
 subtitle,
 children,
 action,
 collapsible = false,
 defaultOpen = false
}: {
 title: string;
 subtitle?: string;
 children: ReactNode;
 action?: ReactNode;
 collapsible?: boolean;
 defaultOpen?: boolean;
}) {
 const header = (
  <>
   <div>
    <h2>{title}</h2>
    {subtitle ? <p>{subtitle}</p> : null}
   </div>
   {action ? <div className={styles.panelAction}>{action}</div> : null}
  </>
 );

 if (collapsible) {
  return (
   <details className={styles.panel} open={defaultOpen}>
    <summary className={`${styles.panelHeader} ${styles.panelSummary}`}>{header}</summary>
    {children}
   </details>
  );
 }

 return (
  <section className={styles.panel}>
   <div className={styles.panelHeader}>{header}</div>
   {children}
  </section>
 );
}

export function DataTable({
 columns,
 rows,
 columnsTemplate
}: {
 columns: TableColumn[];
 rows: TableRow[];
 columnsTemplate?: string;
}) {
 return (
  <div className={styles.tableViewport}>
   <div className={styles.table} style={{ "--cols": columnsTemplate } as CSSProperties}>
    <div className={styles.tableHead}>
     {columns.map((column) => (
      <span key={typeof column === "string" ? column : column.label}>
       {typeof column === "string" ? (
        column
       ) : (
        <Link
         className={styles.sortHeader}
         data-active={column.active ? "true" : "false"}
         href={column.href}
        >
         {column.label}
         {column.active ? <small>{column.direction === "desc" ? "↓" : "↑"}</small> : null}
        </Link>
       )}
      </span>
     ))}
    </div>
    {rows.map((row, index) => {
     const content = row.cells.map((cell, cellIndex) => (
      <span key={cellIndex}>
       {cellIndex === 0 ? <strong>{cell}</strong> : cell}
      </span>
     ));

     return row.href ? (
      <Link className={styles.row} href={row.href} key={`${row.href}-${index}`} data-dash-row="" data-tone={row.tone}>
       {content}
      </Link>
     ) : (
      <div className={styles.row} key={index} data-dash-row="" data-tone={row.tone}>
       {content}
      </div>
     );
    })}
   </div>
  </div>
 );
}

export function CardList({ items }: { items: Array<{ title: string; body: string; tone?: "blue" | "gold" | "red" | "green" }> }) {
 return (
  <ul className={styles.list}>
   {items.map((item) => (
    <li key={item.title} data-dash-searchable="">
     <strong>{item.title}</strong>
     <span>{item.body}</span>
     <div className={styles.metricBar}>
      <span style={{ "--tone": item.tone ? toneColor[item.tone] : "#123885" } as CSSProperties} />
     </div>
    </li>
   ))}
  </ul>
 );
}

export function Note({ children }: { children: ReactNode }) {
 return <div className={styles.note}>{children}</div>;
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./dashboard.module.css";

const items = [
  ["Vue generale", "/dashboard"],
  ["Leads", "/dashboard/demandes"],
  ["Fiche demande", "/dashboard/demandes/demo-lead-alpha"],
  ["Human review", "/dashboard/human-review"],
  ["Relances", "/dashboard/relances"],
  ["Devis", "/dashboard/devis"],
  ["Couts logs", "/dashboard/couts-logs"],
  ["Partenaires autocars", "/dashboard/partenaires"],
  ["Agenda commerciaux", "/dashboard/agenda-commerciaux"],
  ["Admin vue", "/dashboard/admin"],
  ["Equipe roles", "/dashboard/equipe-roles"],
  ["Pricing", "/dashboard/pricing"],
  ["Automatisations", "/dashboard/automatisations"],
  ["Couts IA admin", "/dashboard/couts-ia-admin"],
  ["RGPD audit", "/dashboard/rgpd-audit"],
  ["Croissance", "/dashboard/croissance"]
];

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <nav className={styles.dashboardNav} aria-label="Dashboard">
      <Link className={styles.brand} href="/">
        <span className={styles.brandMark}>NT</span>
        <span>
          <strong>NeoTravel</strong>
          <span>commercial</span>
        </span>
      </Link>
      <div className={styles.navGroup}>
        {items.map(([label, href]) => (
          <Link key={href} href={href} aria-current={isActive(pathname, href) ? "page" : undefined}>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

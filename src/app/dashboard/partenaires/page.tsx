import { PartnerAvailabilityPanel } from "@/features/partners/components/PartnerAvailabilityPanel";
import { PartnerContextPanel } from "@/features/partners/components/PartnerContextPanel";
import { PartnerList } from "@/features/partners/components/PartnerList";
import { PartnerSelectionPanel } from "@/features/partners/components/PartnerSelectionPanel";
import { getPartnerById } from "@/features/partners/components/partnerData";
import styles from "@/features/partners/components/partners.module.css";

export default async function PartnersPage({
  searchParams
}: {
  searchParams: Promise<{ partner?: string }>;
}) {
  const { partner: selectedPartnerId } = await searchParams;
  const selectedPartner = getPartnerById(selectedPartnerId);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>Partenaires autocaristes</h1>
          <p>
            Vue commerciale indicative pour rapprocher une demande NeoTravel d&apos;un partenaire pertinent. La validation
            finale reste humaine et auditee.
          </p>
        </div>
        <span className={styles.badge}>Intermediation partenaires</span>
      </header>

      <div className={styles.grid}>
        <PartnerList selectedPartnerId={selectedPartnerId} />
        <aside className={styles.side}>
          <PartnerContextPanel partner={selectedPartner} />
          <PartnerSelectionPanel partner={selectedPartner} />
          <PartnerAvailabilityPanel partner={selectedPartner} />
        </aside>
      </div>
    </main>
  );
}

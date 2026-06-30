import type { ReactNode } from "react";
import { CookieConsentBanner } from "@/shared/cookies/CookieConsentBanner";

export default function ClientLegacyLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CookieConsentBanner />
    </>
  );
}

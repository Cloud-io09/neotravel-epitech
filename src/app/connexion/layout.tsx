import type { ReactNode } from "react";
import { CookieConsentBanner } from "@/shared/cookies/CookieConsentBanner";

export default function ConnexionLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <CookieConsentBanner />
    </>
  );
}

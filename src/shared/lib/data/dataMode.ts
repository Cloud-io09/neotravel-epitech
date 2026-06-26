import { getDataMode, isDemoMode } from "@/shared/lib/demo/demoMode";

let warned = false;

export function shouldUseDemoData() {
  const demo = isDemoMode();
  if (demo && !warned) {
    warned = true;
    console.warn("[NeoTravel] DEMO_MODE actif : utilisation du demoStore, aucun appel Supabase.");
  }
  return demo;
}

export function currentDataMode() {
  return getDataMode();
}

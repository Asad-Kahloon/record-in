import { RatesCard } from "@/components/rates/rates-card";
import { getRatesSnapshot } from "@/lib/rates";

/** Streams in after the rest of Home, so a slow rate provider never holds it up. */
export async function HomeRates() {
  const snapshot = await getRatesSnapshot();
  return snapshot ? <RatesCard snapshot={snapshot} /> : null;
}

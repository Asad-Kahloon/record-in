import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { WelcomeFlow } from "@/components/welcome/welcome-flow";
import { requireProfile } from "@/lib/data";
import { getAppConfig } from "@/lib/env";
import { displayName } from "@/lib/format";

export const metadata: Metadata = { title: "Welcome" };

// First sign-in: a short intro, then every account picks a main currency.
// The guided tour starts on Home right after.
export default async function WelcomePage() {
  const profile = await requireProfile();
  if (!profile.is_active) redirect("/suspended");
  if (profile.currency) redirect("/dashboard");

  const config = getAppConfig();

  return (
    <main className="flex min-h-svh flex-col items-center bg-app-glow px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <Brand />
      <div className="mt-8 w-full max-w-md">
        <WelcomeFlow name={displayName(profile).split(" ")[0]} suggested={config.currency} locale={config.locale} />
      </div>
    </main>
  );
}

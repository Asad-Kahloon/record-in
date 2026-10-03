import {
  ArrowLeftRightIcon,
  ArrowRightIcon,
  ChartColumnIcon,
  HandCoinsIcon,
  ShieldCheckIcon,
  TargetIcon,
  WalletIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Brand } from "@/components/brand";
import { ThemeToggle } from "@/components/providers/theme";
import { Button } from "@/components/ui/button";
import { APP_DESCRIPTION, APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { getClaims } from "@/lib/data";

export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}: expense, income and budget tracker`,
  description: APP_DESCRIPTION,
  alternates: { canonical: "/" },
};

const FEATURES = [
  { icon: WalletIcon, title: "Income and expenses", body: "Record what comes in and every penny that goes out, in seconds." },
  { icon: HandCoinsIcon, title: "Borrow and lend", body: "Track who owes whom, and record money as it comes back — in full or in parts." },
  { icon: TargetIcon, title: "Budgets", body: "Monthly limits that tell you what is safe to spend each day." },
  { icon: ArrowLeftRightIcon, title: "Any currency", body: "Add dollars, dirhams or euros — converted into your main currency." },
  { icon: ChartColumnIcon, title: "Clear reports", body: "Each month: carried in, money in, money out, and what is left." },
  { icon: ShieldCheckIcon, title: "Private by design", body: "Only you see your records, and one tap hides every amount." },
];

const STEPS = [
  { title: "Create your account", body: "Pick your main currency once — you can change it any time." },
  { title: "Record every penny", body: "Income, spending, and money you borrowed or lent." },
  { title: "See where it goes", body: "Budgets keep you on track and monthly reports show the full picture." },
];

export default async function LandingPage() {
  let signedIn = false;
  try {
    signedIn = Boolean(await getClaims());
  } catch {
    // Not configured yet — show the public page.
  }
  if (signedIn) redirect("/dashboard");

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: APP_NAME,
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web, iOS, Android",
    description: APP_DESCRIPTION,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <main className="min-h-svh bg-app-glow">
      <script type="application/ld+json" nonce={nonce} dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] pb-4">
        <Brand />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full px-4">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl px-5 pt-10 pb-14 text-center sm:pt-16">
        <p className="text-sm font-semibold text-brand">{APP_TAGLINE}</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Know exactly where your money goes
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-balance text-muted-foreground">{APP_DESCRIPTION}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild className="h-12 w-full rounded-xl px-6 text-base sm:w-auto">
            <Link href="/signup">
              Create your account
              <ArrowRightIcon />
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-12 w-full rounded-xl px-6 text-base sm:w-auto">
            <Link href="/login">I already have one</Link>
          </Button>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">Works on your phone and your laptop. Add it to your Home Screen.</p>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 pb-16">
        <h2 className="sr-only">What {APP_NAME} does</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
              <span className="flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand">
                <feature.icon className="size-5" />
              </span>
              <h3 className="mt-4 font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 pb-16">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-5 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
              <span className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
                {index + 1}
              </span>
              <h3 className="mt-3 font-semibold">{step.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="flex flex-col items-center justify-between gap-3 border-t pt-6 text-sm text-muted-foreground sm:flex-row">
          <Brand className="text-foreground" />
          <p>
            © {new Date().getFullYear()} {APP_NAME}. Every penny, recorded.
          </p>
        </div>
      </footer>
    </main>
  );
}

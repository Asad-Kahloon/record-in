"use client";

import { ArrowLeftRightIcon, ArrowRightIcon, HandCoinsIcon, TargetIcon, WalletIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { CurrencyPicker } from "@/components/welcome/currency-picker";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

const SLIDES = [
  {
    icon: WalletIcon,
    accent: "from-brand to-[#3f33b0]",
    title: "Your money, beautifully simple",
    body: "Log income and everyday spending in seconds, and always know what's left for the month.",
  },
  {
    icon: TargetIcon,
    accent: "from-[#3987e5] to-[#1d4f9a]",
    title: "Budgets that keep you on track",
    body: "Set monthly limits and see how much is safe to spend each day, with a heads-up before you overspend.",
  },
  {
    icon: HandCoinsIcon,
    accent: "from-[#199e70] to-[#0d5c41]",
    title: "Borrow, lend and settle up",
    body: "Keep track of who owes whom, then mark it as paid back when the money moves.",
  },
  {
    icon: ArrowLeftRightIcon,
    accent: "from-[#d95926] to-[#8a3312]",
    title: "Any currency, one balance",
    body: "Add dollars, dirhams or euros. They're converted into your main currency automatically.",
  },
];

export function WelcomeFlow({ name, suggested, locale }: { name: string; suggested: string; locale: string }) {
  const [step, setStep] = useState<"intro" | "currency">("intro");
  const [api, setApi] = useState<CarouselApi>();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setIndex(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const last = index === SLIDES.length - 1;

  if (step === "currency") {
    return (
      <div className="space-y-8 animate-in fade-in-0 slide-in-from-right-4">
        <div className="space-y-3 text-center">
          <p className="text-sm font-semibold text-brand">Last step</p>
          <h1 className="text-3xl font-semibold tracking-tight">Pick your main currency</h1>
          <p className="text-balance text-muted-foreground">
            Every total is shown in it. You can still add money in any currency, and change this later in your profile.
          </p>
        </div>
        <CurrencyPicker suggested={suggested} locale={locale} />
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setStep("intro")}>
          Back to intro
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand">Welcome, {name}</p>
        <h1 className="sr-only">Welcome to Ledger</h1>
      </div>

      <Carousel setApi={setApi} opts={{ loop: false }} className="w-full">
        <CarouselContent>
          {SLIDES.map((slide) => (
            <CarouselItem key={slide.title}>
              <div className="flex flex-col items-center gap-7 px-2 text-center">
                <div
                  className={cn(
                    "relative flex aspect-square w-44 items-center justify-center overflow-hidden rounded-[2.5rem] bg-linear-to-br text-white shadow-[0_30px_60px_-30px_rgba(0,0,0,0.9)] sm:w-52",
                    slide.accent,
                  )}
                >
                  <div aria-hidden className="absolute -top-10 -right-10 size-32 rounded-full bg-white/20 blur-2xl" />
                  <slide.icon className="relative size-20" strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-semibold tracking-tight text-balance">{slide.title}</h2>
                  <p className="text-balance text-muted-foreground">{slide.body}</p>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      <div className="flex justify-center gap-2">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            onClick={() => api?.scrollTo(i)}
            className={cn("h-2 rounded-full transition-all", i === index ? "w-6 bg-brand" : "w-2 bg-foreground/20")}
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <Button className="h-12 rounded-xl text-base" onClick={() => (last ? setStep("currency") : api?.scrollNext())}>
          {last ? "Get started" : "Next"}
          <ArrowRightIcon />
        </Button>
        {!last ? (
          <Button variant="ghost" className="text-muted-foreground" onClick={() => setStep("currency")}>
            Skip intro
          </Button>
        ) : null}
      </div>
    </div>
  );
}

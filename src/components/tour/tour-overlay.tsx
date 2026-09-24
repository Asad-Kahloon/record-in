"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { TourStep } from "@/components/tour/tour-steps";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PAD = 8;
const GAP = 12;

function findTarget(selector?: string): HTMLElement | null {
  if (!selector) return null;
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden") return el;
  }
  return null;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

interface Box {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  // Only steps whose target is actually on screen right now.
  const [available] = useState(() => steps.filter((s) => !s.target || findTarget(s.target)));
  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Box | null>(null);
  const [cardHeight, setCardHeight] = useState(200);
  const cardRef = useRef<HTMLDivElement>(null);
  const step = available[index];
  const last = index === available.length - 1;

  const next = useCallback(() => (last ? onClose() : setIndex((i) => i + 1)), [last, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Bring the target into view and move focus to the card on each step.
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    findTarget(step?.target)?.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
    cardRef.current?.focus({ preventScroll: true });
  }, [step]);

  // Follow the target while the page scrolls or resizes.
  useEffect(() => {
    let frame = 0;
    const track = () => {
      const r = findTarget(step?.target)?.getBoundingClientRect();
      const box = r ? { top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 } : null;
      setHole((prev) =>
        prev && box && prev.top === box.top && prev.left === box.left && prev.width === box.width && prev.height === box.height
          ? prev
          : box,
      );
      if (cardRef.current) setCardHeight(cardRef.current.offsetHeight);
      frame = requestAnimationFrame(track);
    };
    track();
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, onClose]);

  if (!step) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardWidth = Math.min(352, vw - GAP * 2);
  let position: React.CSSProperties;

  if (!hole) {
    position = { top: "50%", left: "50%", width: cardWidth, transform: "translate(-50%, -50%)" };
  } else if (vw < 768) {
    // Phones: dock the card at the edge away from the highlighted element.
    const low = hole.top + hole.height / 2 > vh / 2;
    position = low
      ? { top: `calc(env(safe-area-inset-top) + ${GAP}px)`, left: GAP, right: GAP }
      : { bottom: `calc(env(safe-area-inset-bottom) + ${GAP}px)`, left: GAP, right: GAP };
  } else if (hole.height > vh * 0.6) {
    // Tall targets like the sidebar: sit beside them.
    position = {
      top: clamp(hole.top + 24, GAP, vh - cardHeight - GAP),
      left: clamp(hole.left + hole.width + GAP, GAP, vw - cardWidth - GAP),
      width: cardWidth,
    };
  } else {
    const below = hole.top + hole.height + GAP;
    position = {
      top: below + cardHeight < vh - GAP ? below : clamp(hole.top - cardHeight - GAP, GAP, vh - cardHeight - GAP),
      left: clamp(hole.left, GAP, vw - cardWidth - GAP),
      width: cardWidth,
    };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      {hole ? (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-brand transition-all duration-300 motion-reduce:transition-none"
          style={{ ...hole, boxShadow: "0 0 0 9999px rgb(4 4 8 / 0.74)" }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-[rgb(4_4_8/0.74)] backdrop-blur-[2px]" />
      )}

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        className="absolute rounded-2xl bg-popover p-5 text-popover-foreground shadow-2xl ring-1 ring-foreground/10 outline-none animate-in fade-in-0 zoom-in-95"
        style={position}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-brand tabular-nums">
            {index + 1} of {available.length}
          </span>
          {!last ? (
            <Button variant="ghost" size="xs" className="-mr-2 text-muted-foreground" onClick={onClose}>
              Skip tour
            </Button>
          ) : null}
        </div>
        <h2 id="tour-title" className="mt-2 text-lg font-semibold tracking-tight">
          {step.title}
        </h2>
        <p id="tour-body" className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {step.body}
        </p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5" aria-hidden>
            {available.map((s, i) => (
              <span
                key={s.id}
                className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-brand" : "w-1.5 bg-foreground/20")}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {index > 0 ? (
              <Button variant="outline" size="sm" onClick={back}>
                Back
              </Button>
            ) : null}
            <Button size="sm" onClick={next}>
              {last ? "Done" : index === 0 ? "Start tour" : "Next"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

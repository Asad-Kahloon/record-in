import {
  Baby,
  Banknote,
  Car,
  CircleEllipsis,
  Clapperboard,
  CreditCard,
  Fuel,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Landmark,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Utensils,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { PaymentMethod } from "@/lib/types";

// Category names live in the database; icons are a UI concern and live here.
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  groceries: ShoppingBasket,
  transport: Car,
  fuel: Fuel,
  bills: Receipt,
  rent: House,
  mobile: Smartphone,
  shopping: ShoppingBag,
  health: HeartPulse,
  education: GraduationCap,
  entertainment: Clapperboard,
  travel: Plane,
  family: Baby,
  personal: Sparkles,
  subscriptions: Repeat,
  gifts: Gift,
  other: CircleEllipsis,
};

export function categoryIcon(slug: string | null | undefined): LucideIcon {
  return (slug && CATEGORY_ICONS[slug]) || CircleEllipsis;
}

export const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: "cash", label: "Cash", icon: Banknote },
  { value: "card", label: "Card", icon: CreditCard },
  { value: "bank", label: "Bank", icon: Landmark },
  { value: "wallet", label: "Wallet", icon: Wallet },
  { value: "other", label: "Other", icon: CircleEllipsis },
];

export function paymentMethodLabel(method: string | null | undefined): string {
  return PAYMENT_METHOD_OPTIONS.find((m) => m.value === method)?.label ?? "Other";
}

export function paymentMethodIcon(method: string | null | undefined): LucideIcon {
  return PAYMENT_METHOD_OPTIONS.find((m) => m.value === method)?.icon ?? CircleEllipsis;
}

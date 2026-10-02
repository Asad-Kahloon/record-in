import {
  ArrowLeftRightIcon,
  BellIcon,
  ChartCandlestickIcon,
  ChartColumnIcon,
  HandCoinsIcon,
  HouseIcon,
  PiggyBankIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  TargetIcon,
  UserRoundIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  /** Label for tight spaces like the bottom bar. */
  short?: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const HOME_NAV: NavItem = { title: "Home", href: "/dashboard", icon: HouseIcon };
export const TRANSACTIONS_NAV: NavItem = {
  title: "Transactions",
  short: "Activity",
  href: "/transactions",
  icon: ArrowLeftRightIcon,
  description: "Everything in and out",
};
export const EXPENSES_NAV: NavItem = { title: "Expenses", href: "/expenses", icon: ReceiptTextIcon, description: "Daily spending" };
export const INCOME_NAV: NavItem = { title: "Income", href: "/income", icon: WalletIcon, description: "Money coming in" };
export const DEBTS_NAV: NavItem = {
  title: "Borrow & lend",
  short: "Debts",
  href: "/debts",
  icon: HandCoinsIcon,
  description: "Who owes whom",
};
export const BUDGETS_NAV: NavItem = { title: "Budgets", href: "/budgets", icon: TargetIcon, description: "Monthly limits" };
export const GOALS_NAV: NavItem = {
  title: "Aims",
  href: "/goals",
  icon: PiggyBankIcon,
  description: "Saving for what's next",
};
export const REPORTS_NAV: NavItem = { title: "Reports", href: "/reports", icon: ChartColumnIcon, description: "Month & overall" };
export const RATES_NAV: NavItem = {
  title: "Exchange rates",
  short: "Rates",
  href: "/rates",
  icon: ChartCandlestickIcon,
  description: "Live currency rates",
};
export const NOTIFICATIONS_NAV: NavItem = { title: "Notifications", href: "/notifications", icon: BellIcon, description: "Account activity" };
export const PROFILE_NAV: NavItem = { title: "Profile", href: "/profile", icon: UserRoundIcon, description: "Account & currency" };
export const ADMIN_NAV: NavItem = { title: "All accounts", href: "/admin", icon: ShieldCheckIcon, description: "Super admin" };

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Overview", items: [HOME_NAV, TRANSACTIONS_NAV] },
  { label: "Money", items: [EXPENSES_NAV, INCOME_NAV, DEBTS_NAV, BUDGETS_NAV, GOALS_NAV] },
  { label: "Insights", items: [REPORTS_NAV, RATES_NAV] },
];

const ALL_NAV = [...NAV_GROUPS.flatMap((g) => g.items), NOTIFICATIONS_NAV, PROFILE_NAV, ADMIN_NAV];

export function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function pageTitle(pathname: string): string {
  if (pathname.startsWith("/admin/users/")) return "Account";
  return ALL_NAV.find((item) => isActivePath(pathname, item.href))?.title ?? "";
}

export interface ShellUser {
  name: string;
  email: string;
  avatarUrl: string | null;
  isSuperadmin: boolean;
  currency: string;
}

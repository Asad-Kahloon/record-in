export interface TourStep {
  id: string;
  /** CSS selector; the first visible match is spotlighted. Omit for a centered card. */
  target?: string;
  title: string;
  body: string;
}

// Targets carry data-tour="…" attributes. Steps whose target isn't on screen
// (for example a desktop-only button on a phone) are skipped automatically.
export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to RecordIn",
    body: "Here's a one-minute tour of RecordIn, where every penny is recorded. You can replay it any time from the ? button.",
  },
  {
    id: "balance",
    target: '[data-tour="balance"]',
    title: "Your balance card",
    body: "What's left this month — income minus spending, in your main currency. Tap the eye to hide every amount when people are around.",
  },
  {
    id: "actions",
    target: '[data-tour="quick-actions"]',
    title: "Quick actions",
    body: "Add an expense or income, record money you borrowed or lent, and manage budgets — one tap each.",
  },
  {
    id: "budget",
    target: '[data-tour="budget"]',
    title: "Stay on budget",
    body: "Set a monthly limit and see how much is safe to spend per day. The bar turns amber when you're close and red when you're over.",
  },
  {
    id: "aims",
    target: '[data-tour="aims"]',
    title: "Save for what's next",
    body: "An aim is something you're saving for — a car, a laptop, a trip. Tell us the cost and the date, pick daily, weekly, monthly or yearly, and we'll ask for one instalment at a time. Money you set aside leaves your balance and waits in the aims wallet.",
  },
  {
    id: "transactions",
    target: '[data-tour="transactions"]',
    title: "Every transaction",
    body: "Money in and money out in one feed. Tap an entry to open it — you can edit or delete it for 30 minutes after adding.",
  },
  {
    id: "add",
    target: '[data-tour="add"]',
    title: "Add from anywhere",
    body: "Use this button on any screen to record an expense, income, or money you borrowed or lent.",
  },
  {
    id: "nav",
    target: '[data-tour="nav"]',
    title: "Find your way",
    body: "Transactions and reports are right here. Borrow & lend, budgets, notifications and your profile are under More.",
  },
  {
    id: "notifications",
    target: '[data-tour="notifications"]',
    title: "Notifications",
    body: "Account activity shows up here, with a badge when there's something new.",
  },
  {
    id: "tour",
    target: '[data-tour="tour"]',
    title: "You're all set",
    body: "Tap this button whenever you want the tour again. Enjoy!",
  },
];

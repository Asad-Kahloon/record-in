import type { Metadata } from "next";

import { GoalBoard } from "@/components/goals/goal-board";
import { GoalHistory } from "@/components/goals/goal-history";
import { PageHeader } from "@/components/page-header";
import { getGoalSavings, getGoalSummary, getGoals, requireActiveProfile, syncGoalReminders } from "@/lib/data";
import { getAppConfig } from "@/lib/env";

export const metadata: Metadata = { title: "Aims" };

export default async function GoalsPage() {
  const profile = await requireActiveProfile();
  const config = getAppConfig(profile.currency);

  // Opening the page is what builds this period's reminders.
  await syncGoalReminders();
  const [goals, summary, savings] = await Promise.all([
    getGoals(null),
    getGoalSummary(null),
    getGoalSavings(null, null, 20),
  ]);

  return (
    <>
      <PageHeader
        title="Aims"
        description={`Save for what's next in ${config.currency}. Money you set aside leaves your balance and waits here until you need it.`}
      />
      <GoalBoard goals={goals} summary={summary} />
      <GoalHistory savings={savings} />
    </>
  );
}

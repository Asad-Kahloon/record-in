"use client";

import { HandCoinsIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

import { DebtRow } from "@/components/debts/debt-row";
import { useEntrySheets } from "@/components/providers/entry-sheets";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ItemGroup } from "@/components/ui/item";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Debt, DebtDirection } from "@/lib/types";

function Section({
  items,
  today,
  readOnly,
  empty,
}: {
  items: Debt[];
  today: string;
  readOnly: boolean;
  empty: { title: string; description: string; direction?: DebtDirection; action?: string };
}) {
  const { openDebt, addDebt } = useEntrySheets();

  if (items.length === 0) {
    return (
      <Empty className="border bg-card/50 py-12">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="size-12 rounded-2xl">
            <HandCoinsIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-base">{empty.title}</EmptyTitle>
          <EmptyDescription>{empty.description}</EmptyDescription>
        </EmptyHeader>
        {!readOnly && empty.action ? (
          <EmptyContent>
            <Button onClick={() => addDebt(empty.direction)}>
              <PlusIcon />
              {empty.action}
            </Button>
          </EmptyContent>
        ) : null}
      </Empty>
    );
  }

  return (
    <ItemGroup className="gap-0.5 rounded-2xl bg-card p-1.5 ring-1 ring-foreground/10">
      {items.map((debt) => (
        <DebtRow key={debt.id} debt={debt} today={today} readOnly={readOnly} onOpen={readOnly ? undefined : openDebt} />
      ))}
    </ItemGroup>
  );
}

function Count({ value }: { value: number }) {
  return <span className="ml-1 rounded-full bg-foreground/10 px-1.5 text-[10px] leading-4 tabular-nums">{value}</span>;
}

export function DebtList({ debts, today, readOnly = false }: { debts: Debt[]; today: string; readOnly?: boolean }) {
  const owe = debts.filter((d) => !d.settled_on && d.direction === "borrowed");
  const owed = debts.filter((d) => !d.settled_on && d.direction === "lent");
  const settled = debts.filter((d) => d.settled_on);
  const [tab, setTab] = useState(owe.length || !owed.length ? "owe" : "owed");

  return (
    <Tabs value={tab} onValueChange={setTab} className="gap-4">
      <TabsList className="h-10! w-full md:w-fit">
        <TabsTrigger value="owe" className="px-2.5">
          You owe <Count value={owe.length} />
        </TabsTrigger>
        <TabsTrigger value="owed" className="px-2.5">
          Owed to you <Count value={owed.length} />
        </TabsTrigger>
        <TabsTrigger value="settled" className="px-2.5">
          Settled <Count value={settled.length} />
        </TabsTrigger>
      </TabsList>
      <TabsContent value="owe">
        <Section
          items={owe}
          today={today}
          readOnly={readOnly}
          empty={{
            title: "You don't owe anyone",
            description: "Money you borrow shows up here until you pay it back.",
            direction: "borrowed",
            action: "Record borrowed money",
          }}
        />
      </TabsContent>
      <TabsContent value="owed">
        <Section
          items={owed}
          today={today}
          readOnly={readOnly}
          empty={{
            title: "Nobody owes you",
            description: "Money you lend shows up here until you get it back.",
            direction: "lent",
            action: "Record lent money",
          }}
        />
      </TabsContent>
      <TabsContent value="settled">
        <Section
          items={settled}
          today={today}
          readOnly={readOnly}
          empty={{ title: "Nothing settled yet", description: "Paid back and received entries are kept here." }}
        />
      </TabsContent>
    </Tabs>
  );
}

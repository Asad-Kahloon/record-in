import { BellIcon } from "lucide-react";
import type { Metadata } from "next";

import { NotificationFeed } from "@/components/notification-feed";
import { PageHeader } from "@/components/page-header";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { getNotifications, requireActiveProfile } from "@/lib/data";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const profile = await requireActiveProfile();
  const items = await getNotifications(100);
  const unread = items.filter((item) => !item.read_at).length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          unread
            ? `${unread} new update${unread === 1 ? "" : "s"}`
            : profile.role === "superadmin"
              ? "Activity from every account shows up here."
              : "You're all caught up."
        }
      />

      {items.length === 0 ? (
        <Empty className="border bg-card/50 py-16">
          <EmptyHeader>
            <EmptyMedia variant="icon" className="size-12 rounded-2xl">
              <BellIcon className="size-6" />
            </EmptyMedia>
            <EmptyTitle className="text-base">No notifications yet</EmptyTitle>
            <EmptyDescription>
              {profile.role === "superadmin"
                ? "When someone adds, edits or deletes an entry, you'll see it here."
                : "Updates about your account will appear here."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <NotificationFeed items={items} />
      )}
    </>
  );
}

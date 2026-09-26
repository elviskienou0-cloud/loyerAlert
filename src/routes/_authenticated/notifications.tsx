import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Bell, CheckCheck, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { shortDate } from "@/lib/format";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  type NotificationRow,
  type NotificationType,
} from "@/hooks/useNotifications";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — LoyerAlert" },
      { name: "description", content: "Échéances proches, loyers dus aujourd'hui et retards de paiement." },
    ],
  }),
  component: NotificationsPage,
});

const TYPE_ICON: Record<NotificationType, typeof Clock> = {
  due_soon: Clock,
  due_today: Bell,
  overdue: AlertTriangle,
};

const TYPE_STYLE: Record<NotificationType, string> = {
  due_soon: "bg-amber-500/10 text-amber-600",
  due_today: "bg-orange-500/10 text-orange-600",
  overdue: "bg-destructive/10 text-destructive",
};

function NotificationsPage() {
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useRealtimeSync(["notifications"], [["notifications"]]);

  const rows = notifications.data ?? [];
  const unreadCount = rows.filter((n) => !n.read).length;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Tout est à jour"}
          </p>
        </div>

        {unreadCount > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="mr-2 size-4" />
            Tout marquer comme lu
          </Button>
        ) : null}
      </div>

      {notifications.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          <Bell className="mx-auto mb-3 size-8 opacity-40" />
          Aucune notification pour le moment.
          <br />
          Les rappels d'échéance apparaîtront ici automatiquement.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              onMarkRead={() => markRead.mutate(n.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationRow;
  onMarkRead: () => void;
}) {
  const Icon = TYPE_ICON[notification.type];

  return (
    <li
      className={`flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-colors ${
        notification.read ? "opacity-60" : ""
      }`}
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-full ${TYPE_STYLE[notification.type]}`}>
        <Icon className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{notification.title}</p>
        <p className="text-sm text-muted-foreground">{notification.message}</p>
        <p className="mt-1 text-xs text-muted-foreground">{shortDate(notification.created_at)}</p>
      </div>

      {!notification.read ? (
        <Button variant="ghost" size="sm" onClick={onMarkRead}>
          Marquer lu
        </Button>
      ) : null}
    </li>
  );
}

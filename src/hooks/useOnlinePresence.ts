import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "loyeralert-online-users";

type PresenceMeta = {
  user_id?: string;
  online_at?: string;
  page?: string;
};

export function useOnlinePresence(user: User | null | undefined, page?: string, track = true) {
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setOnlineIds([]);
      return;
    }

    let active = true;
    const channel = supabase.channel(CHANNEL, {
      config: { private: true, presence: { key: user.id } },
    });

    const sync = () => {
      if (!active) return;
      const state = channel.presenceState<PresenceMeta>();
      setOnlineIds(Object.keys(state).filter(Boolean));
    };

    channel.on("presence", { event: "sync" }, sync);
    channel.on("presence", { event: "join" }, sync);
    channel.on("presence", { event: "leave" }, sync);

    const connect = async () => {
      // Realtime Authorization uses the authenticated user's JWT when a
      // private channel is joined. Refresh the session token explicitly so
      // the WebSocket always has the same auth context as the REST client.
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("[LoyerAlert Presence] getSession failed:", error);
      }

      const accessToken = data.session?.access_token;
      if (accessToken) {
        supabase.realtime.setAuth(accessToken);
      }

      void channel.subscribe(async (status, err) => {
        if (!active) return;

        if (status !== "SUBSCRIBED") {
          console.error("[LoyerAlert Presence] channel status:", status, err);
          return;
        }

        if (track) {
          const trackStatus = await channel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
            page: page ?? window.location.pathname,
          });

          if (trackStatus !== "ok") {
            console.error("[LoyerAlert Presence] track failed:", trackStatus);
          }
        }

        sync();
      });
    };

    void connect();

    return () => {
      active = false;
      if (track) void channel.untrack();
      void supabase.removeChannel(channel);
      setOnlineIds([]);
    };
  }, [user?.id, page, track]);

  return {
    onlineIds,
    onlineCount: onlineIds.length,
  };
}

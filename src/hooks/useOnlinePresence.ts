import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const CHANNEL = "loyeralert-online-users";

type PresenceMeta = {
  user_id?: string;
  online_at?: string;
  page?: string;
};

export function useOnlinePresence(user: User | null | undefined, page?: string) {
  const [onlineIds, setOnlineIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      setOnlineIds([]);
      return;
    }

    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key: user.id } },
    });

    const sync = () => {
      const state = channel.presenceState<PresenceMeta>();
      setOnlineIds(
        Object.keys(state).filter((id) => id),
      );
    };

    channel.on("presence", { event: "sync" }, sync);

    let active = true;
    void channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED" || !active) return;
      await channel.track({
        user_id: user.id,
        online_at: new Date().toISOString(),
        page: page ?? window.location.pathname,
      });
      sync();
    });

    return () => {
      active = false;
      void channel.untrack();
      void supabase.removeChannel(channel);
      setOnlineIds([]);
    };
  }, [user?.id, page]);

  return {
    onlineIds,
    onlineCount: onlineIds.length,
  };
}

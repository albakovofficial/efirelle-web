"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";
import { api } from "@/lib/api-client";

interface FollowButtonProps {
  slug: string;
  channelName: string;
  initial: boolean;
  /** Новое число подписчиков после ответа сервера. */
  onChange: (followers: number) => void;
}

/** Кнопка «Отслеживать»: сразу меняет вид, при ошибке сервера возвращает как было. */
export function FollowButton({ slug, channelName, initial, onChange }: FollowButtonProps) {
  const [following, setFollowing] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !following;
    setFollowing(next);
    setBusy(true);
    try {
      const result = next ? await api.follow(slug) : await api.unfollow(slug);
      setFollowing(result.isFollowing);
      onChange(result.followers);
    } catch {
      setFollowing(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      size="lg"
      icon="heart"
      aria-pressed={following}
      disabled={busy}
      title={following ? `Вы отслеживаете ${channelName}` : `Отслеживать ${channelName}`}
      onClick={toggle}
    >
      {following ? "Отслеживаете" : "Отслеживать"}
    </Button>
  );
}

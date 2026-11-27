"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button/Button";

/** Кнопка «Отслеживать». Сейчас состояние локальное; позже — запрос к API. */
export function FollowButton({ channelName }: { channelName: string }) {
  const [following, setFollowing] = useState(false);
  return (
    <Button
      variant={following ? "secondary" : "primary"}
      size="lg"
      icon="heart"
      aria-pressed={following}
      title={following ? `Вы отслеживаете ${channelName}` : `Отслеживать ${channelName}`}
      onClick={() => setFollowing((value) => !value)}
    >
      {following ? "Отслеживаете" : "Отслеживать"}
    </Button>
  );
}

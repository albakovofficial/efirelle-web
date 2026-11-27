"use client";

import { useMemo, useState } from "react";
import { StreamCard } from "@/components/stream/StreamCard/StreamCard";
import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Section, SectionEmpty } from "@/components/ui/Section/Section";
import { SegmentedControl, type SegmentOption } from "@/components/ui/SegmentedControl/SegmentedControl";
import type { Stream } from "@/types";

type Filter = "all" | "small" | "fresh";

const SMALL_CHANNEL_MAX_VIEWERS = 2_000;
const FRESH_STREAM_MAX_SECONDS = 60 * 60;

const filterOptions: readonly SegmentOption<Filter>[] = [
  { value: "all", label: "Все" },
  { value: "small", label: "Небольшие каналы" },
  { value: "fresh", label: "Только начали" },
];

const predicates: Record<Filter, (stream: Stream) => boolean> = {
  all: () => true,
  small: (s) => s.viewers <= SMALL_CHANNEL_MAX_VIEWERS,
  fresh: (s) => s.durationSeconds <= FRESH_STREAM_MAX_SECONDS,
};

/** Персональная лента эфиров с быстрыми фильтрами. */
export function StreamsForYou({ streams }: { streams: Stream[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => streams.filter(predicates[filter]), [streams, filter]);

  return (
    <Section
      id="for-you"
      title="Для вас в эфире"
      aside={<SegmentedControl label="Фильтр эфиров" options={filterOptions} value={filter} onChange={setFilter} />}
    >
      {visible.length > 0 ? (
        <AutoGrid min={280} gap={20} rowGap={28}>
          {visible.map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </AutoGrid>
      ) : (
        <SectionEmpty>Сейчас таких эфиров нет — загляните чуть позже.</SectionEmpty>
      )}
    </Section>
  );
}

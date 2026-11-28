import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { StreamDto } from "../src/modules/channels/repository.js";
import { EMPTY_TASTE, rankStreams } from "../src/modules/discovery/recommend.js";

function stream(slug: string, categoryId: string, viewers: number, durationSeconds = 3600): StreamDto {
  return { channel: { slug }, categoryId, viewers, durationSeconds } as unknown as StreamDto;
}

const slugs = (streams: StreamDto[]) => streams.map((s) => s.channel.slug);

describe("Рекомендации эфиров", () => {
  it("гостю — популярные выше, но маленький только что начавшийся не тонет", () => {
    const ranked = rankStreams([stream("small", "music", 2, 300), stream("big", "games", 500), stream("mid", "talk", 40)], EMPTY_TASTE);
    assert.deepEqual(slugs(ranked), ["big", "small", "mid"]);
  });

  it("подписки и любимые категории поднимаются", () => {
    const taste = { followed: new Set(["friend"]), blocked: new Set<string>(), categories: new Map([["music", 1]]) };
    const ranked = rankStreams([stream("big", "games", 900), stream("friend", "talk", 3), stream("singer", "music", 5)], taste);
    assert.deepEqual(slugs(ranked), ["friend", "singer", "big"]);
  });

  it("заблокированные каналы не показываются", () => {
    const taste = { ...EMPTY_TASTE, blocked: new Set(["troll"]) };
    assert.deepEqual(slugs(rankStreams([stream("troll", "talk", 100), stream("ok", "talk", 1)], taste)), ["ok"]);
  });

  it("одна категория не занимает всю ленту подряд", () => {
    const streams = [stream("g1", "games", 100), stream("g2", "games", 95), stream("g3", "games", 90), stream("m1", "music", 60)];
    assert.ok(slugs(rankStreams(streams, EMPTY_TASTE)).indexOf("m1") < 3);
  });
});

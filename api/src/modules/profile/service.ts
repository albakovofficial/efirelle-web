import type { AppContext } from "../../context.js";

export interface ChannelLink {
  title: string;
  url: string;
}

export interface ChannelAboutDto {
  description: string;
  links: ChannelLink[];
  bannerUrl: string | null;
}

export interface EmoteDto {
  code: string;
  url: string;
}

/** Оформление канала: описание, ссылки, баннер и эмодзи чата. */
export class ProfileService {
  constructor(private readonly ctx: AppContext) {}

  async about(channelId: string): Promise<ChannelAboutDto> {
    const row = await this.ctx.db.one<{ description: string; links: ChannelLink[]; banner_url: string | null }>(
      "SELECT description, links, banner_url FROM channels WHERE user_id = $1",
      [channelId],
    );
    return { description: row?.description ?? "", links: row?.links ?? [], bannerUrl: row?.banner_url ?? null };
  }

  async emotes(channelId: string): Promise<EmoteDto[]> {
    return this.ctx.db.rows<EmoteDto>("SELECT code, url FROM emotes WHERE channel_id = $1 ORDER BY code", [channelId]);
  }
}

import { AutoGrid } from "@/components/ui/AutoGrid/AutoGrid";
import { Section } from "@/components/ui/Section/Section";
import { ScheduleCard } from "@/components/schedule/ScheduleCard";
import type { ChannelAbout as About, ScheduledStream } from "@/types";
import styles from "./ChannelAbout.module.css";

interface ChannelAboutProps {
  name: string;
  about: About;
  schedule: ScheduledStream[];
  signedIn: boolean;
}

/** «О канале»: баннер, описание, ссылки и расписание эфиров. Пустые части не показываются. */
export function ChannelAbout({ name, about, schedule, signedIn }: ChannelAboutProps) {
  const hasAbout = about.bannerUrl || about.description || about.links.length > 0;
  if (!hasAbout && schedule.length === 0) return null;

  return (
    <>
      {schedule.length > 0 && (
        <Section id="schedule" title="Расписание" subtitle="Нажмите «Напомнить» — пришлём уведомление за 5 минут" size="sm">
          <AutoGrid min={240} gap={12}>
            {schedule.map((item) => (
              <ScheduleCard key={item.id} item={item} signedIn={signedIn} showChannel={false} />
            ))}
          </AutoGrid>
        </Section>
      )}
      {hasAbout && (
        <Section id="about" title={`О канале ${name}`} size="sm">
          <div className={styles.card}>
            {about.bannerUrl && <img src={about.bannerUrl} alt="" className={styles.banner} />}
            {about.description && <p className={styles.description}>{about.description}</p>}
            {about.links.length > 0 && (
              <ul className={styles.links}>
                {about.links.map((link) => (
                  <li key={link.url}>
                    <a href={link.url} target="_blank" rel="noopener noreferrer nofollow ugc" className={styles.link}>
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Section>
      )}
    </>
  );
}

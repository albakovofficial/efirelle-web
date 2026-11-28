"use client";

import Link from "next/link";
import { useState } from "react";
import { FormCard } from "@/components/forms/FormCard/FormCard";
import { REPORT_REASONS } from "@/components/chat/MessageMenu/MessageMenu";
import { Button } from "@/components/ui/Button/Button";
import { api } from "@/lib/api-client";
import { channelHref } from "@/lib/routes";
import type { AdminReport } from "@/types";
import styles from "./ReportsQueue.module.css";

const reasonLabel = new Map(REPORT_REASONS.map((reason) => [reason.value, reason.label]));

/** Очередь жалоб: каждую нужно рассмотреть в течение 24 часов (правило App Store 1.2). */
export function ReportsQueue({ reports: initial }: { reports: AdminReport[] }) {
  const [reports, setReports] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function resolve(report: AdminReport, action: "dismiss" | "delete_message" | "ban_user") {
    if (action === "ban_user" && !window.confirm(`Заблокировать ${report.target.name} на платформе?`)) return;
    setBusyId(report.id);
    try {
      await api.resolveReport(report.id, action);
      // Жалобы на то же сообщение закрываются вместе.
      setReports((current) =>
        current.filter((item) => item.id !== report.id && (report.messageId === null || item.messageId !== report.messageId)),
      );
    } finally {
      setBusyId(null);
    }
  }

  if (reports.length === 0) {
    return <FormCard as="div" title="Жалоб нет" subtitle="Все обращения рассмотрены" />;
  }

  return (
    <div className={styles.list}>
      {reports.map((report) => (
        <FormCard
          key={report.id}
          as="div"
          title={reasonLabel.get(report.reason) ?? report.reason}
          subtitle={`${new Date(report.createdAt).toLocaleString("ru-RU")} · от ${report.reporter ?? "удалённого пользователя"}${report.channel ? ` · в чате ${report.channel}` : ""}`}
        >
          <p className={styles.target}>
            Автор: <Link href={channelHref(report.target.slug)}>{report.target.name}</Link>
          </p>
          {report.messageText && <blockquote className={styles.quote}>{report.messageText}</blockquote>}
          <div className={styles.actions}>
            <Button size="sm" disabled={busyId === report.id} onClick={() => resolve(report, "dismiss")}>
              Нарушения нет
            </Button>
            {report.messageId && (
              <Button size="sm" disabled={busyId === report.id} onClick={() => resolve(report, "delete_message")}>
                Удалить сообщение
              </Button>
            )}
            <Button size="sm" variant="dark" disabled={busyId === report.id} onClick={() => resolve(report, "ban_user")}>
              Заблокировать автора
            </Button>
          </div>
        </FormCard>
      ))}
    </div>
  );
}

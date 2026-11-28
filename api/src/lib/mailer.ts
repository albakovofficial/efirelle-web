import nodemailer from "nodemailer";
import type { SmtpConfig } from "../config.js";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Отправка писем. Без настроенного SMTP письма не уходят — `isEnabled` подскажет, можно ли на них рассчитывать. */
export interface Mailer {
  readonly isEnabled: boolean;
  send(mail: Mail): Promise<void>;
}

export function createMailer(smtp: SmtpConfig | null): Mailer {
  if (!smtp) {
    return {
      isEnabled: false,
      async send() {
        throw new Error("SMTP не настроен");
      },
    };
  }
  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: { user: smtp.user, pass: smtp.password },
  });
  return {
    isEnabled: true,
    async send(mail) {
      await transport.sendMail({ from: smtp.from, ...mail });
    },
  };
}

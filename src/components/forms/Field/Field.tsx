import type { InputHTMLAttributes, ReactNode } from "react";
import styles from "./Field.module.css";

interface FieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  /** Подсказка под полем. */
  hint?: ReactNode;
  name: string;
}

/** Поле формы с подписью. Значение читается из FormData по `name`. */
export function Field({ label, hint, name, id, ...input }: FieldProps) {
  const inputId = id ?? `field-${name}`;
  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input id={inputId} name={name} className={styles.input} {...input} />
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

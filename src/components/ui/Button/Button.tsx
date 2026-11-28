import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon, type IconName } from "../Icon/Icon";
import styles from "./Button.module.css";

type Variant = "primary" | "dark" | "secondary" | "soft" | "glass" | "ghost";
type Size = "sm" | "md" | "lg";

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  className?: string;
}

/** С текстом — подпись видна; без текста — обязателен aria-label. */
type Content = { children: ReactNode; "aria-label"?: string } | { children?: never; "aria-label": string };

type ButtonProps = CommonProps &
  Content &
  (
    | ({ href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "aria-label">)
    | { href: string }
  );

/** Единая кнопка проекта. С `href` рендерится как ссылка Next.js. */
export function Button(props: ButtonProps) {
  const { variant = "secondary", size = "md", icon, className, children, ...rest } = props;
  const iconOnly = !children;
  const classes = [styles.button, styles[variant], styles[size], iconOnly && styles.iconOnly, className]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      {icon && <Icon name={icon} size={size === "sm" ? 16 : 19} />}
      {children}
    </>
  );

  if ("href" in rest && rest.href !== undefined) {
    const { href, ...linkRest } = rest;
    return (
      <Link href={href} className={classes} {...linkRest}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={classes} {...rest}>
      {content}
    </button>
  );
}

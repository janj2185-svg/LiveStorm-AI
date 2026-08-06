import type { ButtonHTMLAttributes } from "react";

import styles from "./Button.module.css";

type Variant = "gold" | "ghost" | "danger" | "subtle";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "md" | "sm";
  fullWidth?: boolean;
}

export function Button({
  variant = "ghost",
  size = "md",
  fullWidth = false,
  className,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.base,
    styles[variant],
    size === "sm" ? styles.small : "",
    fullWidth ? styles.fullWidth : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return <button className={classes} {...rest} />;
}

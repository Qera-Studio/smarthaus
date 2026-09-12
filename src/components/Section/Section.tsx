import styles from "./Section.module.scss";

type SectionProps = {
  as?: "section" | "div" | "aside";
  variant?: "canvas" | "surface" | "inverse";
  spacing?: "sm" | "md" | "lg";
  full?: boolean;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>;

export default function Section({
  as: Tag = "section",
  variant = "canvas",
  spacing = "md",
  full = false,
  children,
  className,
  ...rest
}: SectionProps) {
  const cls = [
    styles.section,
    styles[variant],
    styles[`spacing-${spacing}`],
    full && styles.full,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={cls} {...rest}>
      {full ? children : <div className={styles.inner}>{children}</div>}
    </Tag>
  );
}

import type { ComponentProps, ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

/** Strict black & white buttons: white on black (primary) or black with a thin border (outline). */
export function buttonClass(variant: ButtonVariant = "outline", size: ButtonSize = "md", extra = ""): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-wide transition-[background-color,border-color,box-shadow,transform] duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap";
  const sizes: Record<ButtonSize, string> = {
    sm: "h-9 px-4 text-xs",
    md: "h-11 px-6 text-sm",
    lg: "h-13 px-8 text-sm sm:text-[0.95rem]",
  };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-white text-black border border-white btn-glow hover:bg-white/85",
    outline: "bg-white/[0.03] text-white border border-white/15 hover:border-white/60 hover:bg-white/[0.07]",
    ghost: "bg-transparent text-grey hover:text-white",
    danger: "bg-black text-white border border-line hover:border-white hover:bg-white hover:text-black",
  };
  return `${base} ${sizes[size]} ${variants[variant]} ${extra}`.trim();
}

export function Button({
  variant = "outline",
  size = "md",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export const inputClass =
  "w-full rounded-xl border border-white/12 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-muted transition-colors focus:border-white focus:outline-none disabled:opacity-50";

export function Input({ className = "", ...props }: ComponentProps<"input">) {
  return <input className={`${inputClass} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: ComponentProps<"select">) {
  return <select className={`${inputClass} appearance-none pe-10 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 fill=%22none%22><path d=%22M1 1.5l5 5 5-5%22 stroke=%22%23b3b3b3%22 stroke-width=%221.5%22/></svg>')] bg-[length:12px_8px] bg-[position:right_1rem_center] rtl:bg-[position:left_1rem_center] bg-no-repeat ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: ComponentProps<"textarea">) {
  return <textarea className={`${inputClass} min-h-28 resize-y ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={htmlFor} className="block text-xs font-medium uppercase tracking-[0.14em] text-grey">
        {label}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-white" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Badge({ children, tone = "outline" }: { children: ReactNode; tone?: "solid" | "outline" | "muted" }) {
  const tones = {
    solid: "bg-white text-black border-white",
    outline: "bg-black/60 text-white border-white/20 backdrop-blur-md",
    muted: "bg-black/60 text-grey border-white/10 backdrop-blur-md",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-[0.12em] ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function SectionHeading({ title, lead, action, eyebrow }: { title: ReactNode; lead?: ReactNode; action?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-col gap-4 sm:mb-14 sm:flex-row sm:items-end sm:justify-between" data-reveal>
      <div>
        {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
        <h2 className="text-sheen text-3xl font-semibold sm:text-5xl">{title}</h2>
        {lead ? <p className="mt-3 max-w-xl text-base text-grey sm:text-lg">{lead}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" }) {
  const border = tone === "info" ? "border-white/12 text-grey" : "border-white/70 text-white";
  return (
    <div className={`rounded-xl border bg-white/[0.03] px-4 py-3 text-sm ${border}`} role={tone === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-e-transparent ${className}`}
      aria-hidden="true"
    />
  );
}

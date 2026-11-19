"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { Button, Notice, Spinner } from "@/components/ui";
import type { ActionState } from "@/lib/admin/auth";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Form bound to a server action with pending, error and success states. */
export function ActionForm({
  action,
  children,
  className = "",
  resetOnSuccess = false,
  redirectTo,
  onSuccess,
  id,
}: {
  action: Action;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  redirectTo?: (state: { id?: string }) => string;
  onSuccess?: (state: { id?: string; message?: string }) => void;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      onSuccess?.(state);
      if (redirectTo) router.push(redirectTo(state));
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form ref={ref} action={formAction} className={className} id={id}>
      {children}
      {state && !state.ok ? (
        <div className="mt-4">
          <Notice tone="error">{state.error}</Notice>
        </div>
      ) : null}
      {state?.ok && state.message ? (
        <div className="mt-4">
          <Notice tone="success">{state.message}</Notice>
        </div>
      ) : null}
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className = "",
  confirm,
  name,
  value,
}: {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      name={name}
      value={value}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? <Spinner /> : null}
      {children}
    </Button>
  );
}

/** A one-button form (e.g. "Mark as reserved", "Delete") with optional confirmation. */
export function ActionButton({
  action,
  fields,
  children,
  variant = "outline",
  size = "sm",
  confirm,
  className = "",
  redirectTo,
}: {
  action: Action;
  fields: Record<string, string>;
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  confirm?: string;
  className?: string;
  redirectTo?: string;
}) {
  return (
    <ActionForm action={action} className={`inline-block ${className}`} redirectTo={redirectTo ? () => redirectTo : undefined}>
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <SubmitButton variant={variant} size={size} confirm={confirm}>
        {children}
      </SubmitButton>
    </ActionForm>
  );
}

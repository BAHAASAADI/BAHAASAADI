"use client";

import { useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button, Field, Input, Notice, Spinner, Textarea } from "@/components/ui";
import { submitRequestAction } from "@/app/[locale]/actions";
import type { RequestKind } from "@/lib/types";

export interface RequestLabels {
  title: string;
  lead: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  optional: string;
  send: string;
  sending: string;
  close: string;
  sent: string;
  error: string;
  unavailable: string;
}

export function validPhone(value: string) {
  return value.replace(/\D/g, "").length >= 7;
}

/** Saves the request in the dashboard (customer_requests) through a validated database function. */
export function RequestForm({
  kind,
  productId,
  locale,
  labels,
  messageRequired = false,
  defaultMessage = "",
  onDone,
}: {
  kind: RequestKind;
  productId?: string;
  locale: string;
  labels: RequestLabels;
  messageRequired?: boolean;
  defaultMessage?: string;
  onDone?: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (name.length < 2 || !validPhone(phone) || (messageRequired && !message)) {
      setError(labels.error);
      setStatus("error");
      return;
    }
    setStatus("sending");
    setError(null);
    const result = await submitRequestAction({
      kind,
      product_id: productId ?? null,
      name,
      phone,
      email: String(data.get("email") ?? ""),
      message,
      locale,
    }).catch(() => ({ ok: false as const, error: "" }));
    if (!result.ok) {
      setStatus("error");
      setError(/no longer available/i.test(result.error) ? labels.unavailable : labels.error);
      return;
    }
    setStatus("sent");
    onDone?.();
  }

  if (status === "sent") return <Notice tone="success">{labels.sent}</Notice>;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <Field label={labels.name} htmlFor={`${kind}-name`}>
        <Input id={`${kind}-name`} name="name" autoComplete="name" required minLength={2} maxLength={120} />
      </Field>
      <Field label={labels.phone} htmlFor={`${kind}-phone`}>
        <Input id={`${kind}-phone`} name="phone" type="tel" autoComplete="tel" inputMode="tel" required dir="ltr" />
      </Field>
      <Field label={`${labels.email} (${labels.optional})`} htmlFor={`${kind}-email`}>
        <Input id={`${kind}-email`} name="email" type="email" autoComplete="email" dir="ltr" />
      </Field>
      <Field label={messageRequired ? labels.message : `${labels.message} (${labels.optional})`} htmlFor={`${kind}-message`}>
        <Textarea id={`${kind}-message`} name="message" maxLength={2000} required={messageRequired} defaultValue={defaultMessage} />
      </Field>
      {status === "error" && error ? <Notice tone="error">{error}</Notice> : null}
      <Button type="submit" variant="primary" className="w-full" disabled={status === "sending"}>
        {status === "sending" ? (
          <>
            <Spinner /> {labels.sending}
          </>
        ) : (
          labels.send
        )}
      </Button>
    </form>
  );
}

export function RequestDialog({
  trigger,
  triggerClassName,
  ...formProps
}: {
  trigger: ReactNode;
  triggerClassName: string;
} & Parameters<typeof RequestForm>[0]) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className={triggerClassName} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        className="surface m-auto w-[calc(100%-2rem)] max-w-lg rounded-[var(--radius-card)] p-0 text-white shadow-[0_40px_120px_-30px_rgb(var(--glow)/calc(0.18*var(--glow-k)))] backdrop:bg-black/80 backdrop:backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === ref.current) ref.current?.close();
        }}
      >
        <div className="p-6 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sheen text-2xl font-semibold tracking-tight">{formProps.labels.title}</h2>
              <p className="mt-2 text-sm text-grey">{formProps.labels.lead}</p>
            </div>
            <button type="button" onClick={() => ref.current?.close()} aria-label={formProps.labels.close} className="rounded-full p-1 text-grey hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <RequestForm {...formProps} />
        </div>
      </dialog>
    </>
  );
}

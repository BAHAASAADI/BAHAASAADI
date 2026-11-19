"use client";

import type { ComponentProps } from "react";
import { Select } from "@/components/ui";

/** A select that submits its form as soon as the value changes. */
export function AutoSubmitSelect(props: ComponentProps<"select">) {
  return <Select {...props} onChange={(e) => e.currentTarget.form?.requestSubmit()} />;
}

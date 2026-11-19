import Link from "next/link";
import { Logo } from "@/components/brand";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field, Input } from "@/components/ui";
import { requestPasswordReset } from "@/app/admin/actions/auth";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Logo className="mx-auto w-32" sizes="128px" />
        <div className="mt-12 rounded-2xl border border-line p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm text-grey">We will email you a secure link to choose a new password.</p>
          <ActionForm action={requestPasswordReset} className="mt-6 space-y-5">
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </Field>
            <SubmitButton className="w-full">Send reset link</SubmitButton>
          </ActionForm>
          <Link href="/admin/login" className="mt-5 inline-block text-xs text-grey hover:text-white">
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

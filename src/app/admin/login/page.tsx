import Link from "next/link";
import { Logo } from "@/components/brand";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { Field, Input } from "@/components/ui";
import { signIn } from "@/app/admin/actions/auth";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <Logo priority className="mx-auto w-40" sizes="160px" />
        <p className="mt-3 text-center text-[0.65rem] tracking-[0.34em]">ONLY APPLE PRODUCTS</p>
        <div className="mt-12 rounded-2xl border border-line p-6 sm:p-8">
          <h1 className="text-xl font-semibold">Dashboard sign in</h1>
          <ActionForm action={signIn} className="mt-6 space-y-5">
            <input type="hidden" name="next" value={next ?? ""} />
            <Field label="Email" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="username" required />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            <SubmitButton className="w-full">Sign in</SubmitButton>
          </ActionForm>
          <Link href="/admin/forgot-password" className="mt-5 inline-block text-xs text-grey hover:text-white">
            Forgot your password?
          </Link>
        </div>
        <Link href="/" className="mt-8 block text-center text-xs text-grey hover:text-white">
          ← Back to the website
        </Link>
      </div>
    </div>
  );
}

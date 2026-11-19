import { updatePassword } from "@/app/admin/actions/auth";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";

export const metadata = { title: "My account" };

export default async function AccountPage() {
  const { admin } = await requireAdmin();
  return (
    <>
      <PageHeader title="My account" description={`${admin.email} · ${admin.role}`} />
      <Panel title="Change password" className="max-w-lg">
        <ActionForm action={updatePassword} className="space-y-4" resetOnSuccess>
          <Field label="New password" htmlFor="password" hint="At least 10 characters.">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} />
          </Field>
          <Field label="Repeat new password" htmlFor="confirm">
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          </Field>
          <SubmitButton>Update password</SubmitButton>
        </ActionForm>
      </Panel>
    </>
  );
}

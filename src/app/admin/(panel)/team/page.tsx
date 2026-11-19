import { addTeamMember, updateTeamMember } from "@/app/admin/actions/setup";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge, Field, Input, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { dateTime } from "@/lib/admin/data";

export const metadata = { title: "Team" };

const ROLES = [
  { value: "owner", label: "Owner", text: "Everything, including settings, currencies and team." },
  { value: "manager", label: "Manager", text: "Stock, all prices, shops, models, content, enquiries, sales." },
  { value: "staff", label: "Staff", text: "Stock (no price changes or deletions), enquiries, requests, sales and transfers." },
];

export default async function TeamPage() {
  const { supabase, user } = await requireAdmin("owner");
  const { data } = await supabase.from("admins").select("*").order("created_at");
  const canCreate = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);

  return (
    <>
      <PageHeader title="Team" description="People who can sign in to this dashboard and what they are allowed to do." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {ROLES.map((r) => (
          <div key={r.value} className="rounded-2xl border border-line p-4">
            <p className="font-medium">{r.label}</p>
            <p className="mt-1 text-sm text-grey">{r.text}</p>
          </div>
        ))}
      </div>

      <Panel title="Add a team member" className="mb-6" description={canCreate ? "Enter a temporary password to create the account now, or leave it empty to give access to an existing account." : "The account must already exist in Supabase → Authentication → Users. Then add the email here."}>
        <ActionForm action={addTeamMember} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" resetOnSuccess>
          <Field label="Email" htmlFor="t-email">
            <Input id="t-email" name="email" type="email" required autoComplete="off" />
          </Field>
          <Field label="Name" htmlFor="t-name">
            <Input id="t-name" name="full_name" />
          </Field>
          <Field label="Role" htmlFor="t-role">
            <Select id="t-role" name="role" defaultValue="staff">
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          {canCreate ? (
            <Field label="Temporary password" htmlFor="t-password" hint="At least 10 characters.">
              <Input id="t-password" name="password" type="text" autoComplete="new-password" />
            </Field>
          ) : null}
          <div className="sm:col-span-2 lg:col-span-4">
            <SubmitButton>Add member</SubmitButton>
          </div>
        </ActionForm>
      </Panel>

      <div className="space-y-3">
        {(data ?? []).map((a) => (
          <div key={a.user_id} className="rounded-2xl border border-line p-4">
            <ActionForm action={updateTeamMember} className="flex flex-wrap items-end gap-4">
              <input type="hidden" name="user_id" value={a.user_id} />
              <div className="min-w-56 flex-1">
                <p className="font-medium">
                  {a.email} {a.user_id === user.id ? <Badge>You</Badge> : null} {!a.is_active ? <Badge tone="muted">Disabled</Badge> : null}
                </p>
                <p className="text-xs text-grey">Added {dateTime(a.created_at, false)}</p>
              </div>
              <Input name="full_name" defaultValue={a.full_name ?? ""} placeholder="Name" className="max-w-48" aria-label="Name" />
              <Select name="role" defaultValue={a.role} className="!w-auto" aria-label="Role">
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </Select>
              <label className="flex items-center gap-2 pb-3 text-sm">
                <input type="checkbox" name="is_active" defaultChecked={a.is_active} className="h-4 w-4 accent-white" /> Active
              </label>
              <SubmitButton variant="outline" size="sm">
                Save
              </SubmitButton>
            </ActionForm>
          </div>
        ))}
      </div>
    </>
  );
}

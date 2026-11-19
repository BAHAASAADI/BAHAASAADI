import { saveModel } from "@/app/admin/actions/setup";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Badge, Field, Input, Notice, Select } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { getLookups } from "@/lib/admin/data";
import { formatStorage } from "@/lib/format";
import type { IphoneModel } from "@/lib/types";

export const metadata = { title: "iPhone models" };

function ModelFields({ model, disabled }: { model?: IphoneModel; disabled: boolean }) {
  const p = model?.id ?? "new";
  return (
    <fieldset disabled={disabled} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {model ? <input type="hidden" name="id" value={model.id} /> : null}
      {model ? <input type="hidden" name="slug" value={model.slug} /> : null}
      <Field label="Name" htmlFor={`${p}-name`}>
        <Input id={`${p}-name`} name="name" defaultValue={model?.name ?? ""} required placeholder="iPhone 18 Pro" />
      </Field>
      <Field label="Storages" htmlFor={`${p}-storages`} hint="Comma separated, e.g. 256, 512, 1TB">
        <Input id={`${p}-storages`} name="storages" defaultValue={model?.storages.map(formatStorage).join(", ") ?? ""} required />
      </Field>
      <Field label="Release year" htmlFor={`${p}-year`}>
        <Input id={`${p}-year`} name="release_year" type="number" defaultValue={model?.release_year ?? ""} />
      </Field>
      <Field label="Order (higher = newer)" htmlFor={`${p}-sort`}>
        <Input id={`${p}-sort`} name="sort_order" type="number" defaultValue={model?.sort_order ?? 400} />
      </Field>
      <Field label="Colours" htmlFor={`${p}-colors`} hint="Comma separated. Suggestions when adding phones." className="sm:col-span-2 lg:col-span-3">
        <Input id={`${p}-colors`} name="colors" defaultValue={model?.colors.join(", ") ?? ""} />
      </Field>
      <label className="flex items-end gap-3 pb-3 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={model?.is_active ?? true} className="h-4 w-4 accent-white" /> Active
      </label>
      <Field label="Display (inches)" htmlFor={`${p}-display`}>
        <Input id={`${p}-display`} name="display_inches" type="number" step="0.1" min={3} max={10} defaultValue={model?.display_inches ?? ""} />
      </Field>
      <Field label="Chip" htmlFor={`${p}-chip`}>
        <Input id={`${p}-chip`} name="chip" defaultValue={model?.chip ?? ""} placeholder="A17 Pro" />
      </Field>
      <Field label="Unlock" htmlFor={`${p}-bio`}>
        <Select id={`${p}-bio`} name="biometrics" defaultValue={model?.biometrics ?? ""}>
          <option value="">—</option>
          <option value="Face ID">Face ID</option>
          <option value="Touch ID">Touch ID</option>
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Connector" htmlFor={`${p}-conn`}>
          <Select id={`${p}-conn`} name="connector" defaultValue={model?.connector ?? ""}>
            <option value="">—</option>
            <option value="Lightning">Lightning</option>
            <option value="USB-C">USB-C</option>
          </Select>
        </Field>
        <Field label="5G" htmlFor={`${p}-5g`}>
          <Select id={`${p}-5g`} name="has_5g" defaultValue={model?.has_5g == null ? "" : model.has_5g ? "yes" : "no"}>
            <option value="">—</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </Select>
        </Field>
      </div>
    </fieldset>
  );
}

export default async function ModelsPage() {
  const { admin } = await requireAdmin();
  const { models } = await getLookups();
  const canEdit = hasRole(admin.role, "manager");

  return (
    <>
      <PageHeader
        title="iPhone models"
        description="Models available in the trade-in calculator and when adding phones. Inactive models are hidden from customers. Storage options control what customers can select."
      />
      {!canEdit ? (
        <div className="mb-6">
          <Notice>Only owners and managers can edit models.</Notice>
        </div>
      ) : null}
      {canEdit ? (
        <Panel title="Add a model" className="mb-6">
          <ActionForm action={saveModel} resetOnSuccess>
            <ModelFields disabled={false} />
            <div className="mt-4">
              <SubmitButton>Add model</SubmitButton>
            </div>
          </ActionForm>
        </Panel>
      ) : null}
      <div className="divide-y divide-line rounded-2xl border border-line">
        {models.map((m) => (
          <details key={m.id}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-panel">
              <span className="flex items-center gap-3 font-medium">
                {m.name} {!m.is_active ? <Badge tone="muted">Inactive</Badge> : null}
              </span>
              <span className="text-sm text-grey">
                {m.storages.map(formatStorage).join(" · ")}
                {m.release_year ? ` · ${m.release_year}` : ""}
                {m.chip ? ` · ${m.chip}` : " · specs incomplete"}
              </span>
            </summary>
            <div className="border-t border-line p-5">
              <ActionForm action={saveModel}>
                <ModelFields model={m} disabled={!canEdit} />
                {canEdit ? (
                  <div className="mt-4">
                    <SubmitButton>Save</SubmitButton>
                  </div>
                ) : null}
              </ActionForm>
            </div>
          </details>
        ))}
      </div>
    </>
  );
}

import { saveCurrency, saveRates, setMainCurrency } from "@/app/admin/actions/setup";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { PageHeader, Panel, table, tableWrap, td, th } from "@/components/admin/ui";
import { Badge, Field, Input, Notice, Select } from "@/components/ui";
import { hasRole, requireAdmin } from "@/lib/admin/auth";
import { dateTime, getLookups } from "@/lib/admin/data";

export const metadata = { title: "Currencies" };

export default async function CurrenciesPage() {
  const { admin } = await requireAdmin();
  const { currencies, mainCurrency } = await getLookups();
  const canEdit = hasRole(admin.role, "manager");
  const isOwner = hasRole(admin.role, "owner");
  const unconfirmed = currencies.filter((c) => c.is_active && !c.confirmed_at);

  return (
    <>
      <PageHeader
        title="Currencies"
        description={
          <>
            Exchange rates are never fixed and never updated automatically — enter them yourself. The main currency (<strong className="text-white">{mainCurrency}</strong>) is used for buying prices and reports. Each phone keeps the price you set in its own currency; other currencies shown on the website are approximate conversions.
          </>
        }
      />
      {unconfirmed.length ? (
        <div className="mb-6">
          <Notice tone="error">
            {unconfirmed.map((c) => c.code).join(", ")}: the initial exchange rate has not been confirmed yet. Check it and save below.
          </Notice>
        </div>
      ) : null}

      <Panel title="Exchange rates" description={`How many units of each currency equal 1 ${mainCurrency}. “Round to” is used when showing converted prices (e.g. 10 PLN, 500 DZD).`}>
        <ActionForm action={saveRates}>
          <div className={tableWrap}>
            <table className={table}>
              <thead>
                <tr>
                  <th className={th}>Currency</th>
                  <th className={th}>Rate per 1 {mainCurrency}</th>
                  <th className={th}>Round to</th>
                  <th className={th}>Confirmed</th>
                  <th className={th}>Last change</th>
                </tr>
              </thead>
              <tbody>
                {currencies.map((c) => (
                  <tr key={c.code}>
                    <td className={td}>
                      <input type="hidden" name="code" value={c.code} />
                      <span className="font-medium">{c.code}</span> <span className="text-grey">{c.name}</span>{" "}
                      {c.code === mainCurrency ? <Badge tone="solid">Main</Badge> : null} {!c.is_active ? <Badge tone="muted">Inactive</Badge> : null}
                    </td>
                    <td className={td}>
                      <input
                        name={`rate_${c.code}`}
                        type="number"
                        step="any"
                        min={0}
                        defaultValue={Number(c.rate)}
                        readOnly={c.code === mainCurrency || !canEdit}
                        className="w-36 rounded-lg border border-line bg-black px-2 py-1.5 text-sm read-only:opacity-60"
                        aria-label={`${c.code} rate`}
                      />
                    </td>
                    <td className={td}>
                      <input name={`round_${c.code}`} type="number" step="any" min={0} defaultValue={Number(c.round_to)} readOnly={!canEdit} className="w-24 rounded-lg border border-line bg-black px-2 py-1.5 text-sm" aria-label={`${c.code} rounding`} />
                    </td>
                    <td className={`${td} text-grey`}>{c.confirmed_at ? dateTime(c.confirmed_at) : <span className="text-white">Not confirmed</span>}</td>
                    <td className={`${td} text-grey`}>{dateTime(c.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canEdit ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Input name="note" placeholder="Note, e.g. source of the rate" className="max-w-sm" />
              <SubmitButton>Save and confirm rates</SubmitButton>
            </div>
          ) : null}
        </ActionForm>
      </Panel>

      {isOwner ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <Panel title="Add or edit a currency">
            <ActionForm action={saveCurrency} className="grid gap-4 sm:grid-cols-3" resetOnSuccess>
              <Field label="ISO code" htmlFor="c-code">
                <Input id="c-code" name="code" maxLength={3} placeholder="USD" required />
              </Field>
              <Field label="Name" htmlFor="c-name">
                <Input id="c-name" name="name" placeholder="US dollar" required />
              </Field>
              <Field label="Symbol" htmlFor="c-symbol">
                <Input id="c-symbol" name="symbol" placeholder="$" />
              </Field>
              <Field label={`Rate per 1 ${mainCurrency}`} htmlFor="c-rate">
                <Input id="c-rate" name="rate" type="number" step="any" min={0} required />
              </Field>
              <Field label="Round to" htmlFor="c-round">
                <Input id="c-round" name="round_to" type="number" step="any" min={0} defaultValue={1} />
              </Field>
              <Field label="Decimals" htmlFor="c-dec">
                <Input id="c-dec" name="decimals" type="number" min={0} max={4} defaultValue={2} />
              </Field>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4 accent-white" /> Active
              </label>
              <div className="sm:col-span-3">
                <SubmitButton variant="outline">Save currency</SubmitButton>
              </div>
            </ActionForm>
          </Panel>
          <Panel title="Main currency" description="Changing it converts all buying prices, fixed deductions and stored report amounts at the current rate.">
            <ActionForm action={setMainCurrency} className="flex flex-wrap items-end gap-3">
              <Field label="Main currency" htmlFor="main-code">
                <Select id="main-code" name="code" defaultValue={mainCurrency}>
                  {currencies.filter((c) => c.is_active).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton variant="outline" confirm="Change the main currency? Buying prices and reports will be converted at the current rates.">
                Change
              </SubmitButton>
            </ActionForm>
          </Panel>
        </div>
      ) : null}
    </>
  );
}

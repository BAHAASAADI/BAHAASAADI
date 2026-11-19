import { saveSettings } from "@/app/admin/actions/setup";
import { ActionForm, SubmitButton } from "@/components/admin/forms";
import { PageHeader, Panel } from "@/components/admin/ui";
import { Field, Input, Select } from "@/components/ui";
import { requireAdmin } from "@/lib/admin/auth";
import { getLookups } from "@/lib/admin/data";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin("owner");
  const { settings, shops } = await getLookups();

  return (
    <>
      <PageHeader title="Settings" description="Contact details and links used across the website. Shop-specific details (address, hours, WhatsApp) are edited in Shops." />
      <ActionForm action={saveSettings} className="space-y-6">
        <Panel title="Top bar & contact">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shop shown in the top bar" htmlFor="primary_shop_id" hint="Its address, opening hours and telephone appear at the top of every page.">
              <Select id="primary_shop_id" name="primary_shop_id" defaultValue={settings?.primary_shop_id ?? ""}>
                <option value="">First active shop</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Main WhatsApp number" htmlFor="whatsapp_number" hint="With country code. Used when a shop has no WhatsApp number of its own.">
              <Input id="whatsapp_number" name="whatsapp_number" type="tel" defaultValue={settings?.whatsapp_number ?? ""} placeholder="+48 600 000 000" />
            </Field>
            <Field label="Contact telephone" htmlFor="contact_phone">
              <Input id="contact_phone" name="contact_phone" type="tel" defaultValue={settings?.contact_phone ?? ""} />
            </Field>
            <Field label="Contact email" htmlFor="contact_email">
              <Input id="contact_email" name="contact_email" type="email" defaultValue={settings?.contact_email ?? ""} />
            </Field>
          </div>
        </Panel>
        <Panel title="Social media">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Instagram" htmlFor="instagram_url">
              <Input id="instagram_url" name="instagram_url" type="url" defaultValue={settings?.instagram_url ?? ""} placeholder="https://instagram.com/…" />
            </Field>
            <Field label="Facebook" htmlFor="facebook_url">
              <Input id="facebook_url" name="facebook_url" type="url" defaultValue={settings?.facebook_url ?? ""} placeholder="https://facebook.com/…" />
            </Field>
            <Field label="TikTok" htmlFor="tiktok_url">
              <Input id="tiktok_url" name="tiktok_url" type="url" defaultValue={settings?.tiktok_url ?? ""} placeholder="https://tiktok.com/@…" />
            </Field>
          </div>
        </Panel>
        <SubmitButton size="lg">Save settings</SubmitButton>
      </ActionForm>
    </>
  );
}

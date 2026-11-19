"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { saveProduct } from "@/app/admin/actions/inventory";
import { uploadProductPhotos } from "@/components/admin/photos";
import { Button, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { formatStorage } from "@/lib/format";
import { compressImage } from "@/lib/image";
import { CONDITIONS, type Currency, type IphoneModel, type Product, type Shop } from "@/lib/types";
import { CONDITION_LABEL, PARTS_LABEL } from "@/components/admin/ui";

interface Props {
  product?: Product & { imei?: string | null; serial_number?: string | null; internal_notes?: string | null };
  models: IphoneModel[];
  shops: Shop[];
  currencies: Currency[];
  canEditPrices: boolean;
  defaults?: Partial<{
    model_id: string;
    storage_gb: number;
    battery_health: number;
    condition: string;
    parts_status: string;
    replaced_parts: string;
    shop_id: string;
    purchase_price: number;
    purchase_currency: string;
    purchase_source: string;
    counterparty_name: string;
    counterparty_phone: string;
    enquiry_id: string;
  }>;
}

export function ProductForm({ product, models, shops, currencies, canEditPrices, defaults = {} }: Props) {
  const router = useRouter();
  const [state, action, pending] = useActionState(saveProduct, null);
  const [modelId, setModelId] = useState(product?.model_id ?? defaults.model_id ?? "");
  const [shopId, setShopId] = useState(product?.shop_id ?? defaults.shop_id ?? (shops.length === 1 ? shops[0].id : ""));
  const [currency, setCurrency] = useState(product?.currency ?? shops.find((s) => s.id === shopId)?.currency ?? "");
  const [parts, setParts] = useState(product?.parts_status ?? defaults.parts_status ?? "original");
  const [files, setFiles] = useState<{ id: string; blob: Blob; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState<string | null>(null);

  const model = models.find((m) => m.id === modelId);
  const activeShops = shops.filter((s) => s.is_active || s.id === product?.shop_id);
  const selectableModels = useMemo(() => models.filter((m) => m.is_active || m.id === product?.model_id), [models, product?.model_id]);


  useEffect(() => {
    if (!state?.ok || !state.id) return;
    if (product) {
      router.refresh();
      return;
    }
    const id = state.id;
    (async () => {
      if (files.length) {
        setUploading(true);
        const result = await uploadProductPhotos(id, files.map((f) => f.blob));
        setUploading(false);
        if (result.failed) setUploadNote(`${result.failed} photo(s) could not be uploaded. You can add them on the next page.`);
      }
      router.push(`/admin/inventory/${id}?created=1`);
    })();
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  async function addFiles(list: FileList | null) {
    if (!list) return;
    const next: { id: string; blob: Blob; url: string }[] = [];
    for (const file of Array.from(list)) {
      try {
        const blob = await compressImage(file, 2000, 0.88);
        next.push({ id: crypto.randomUUID(), blob, url: URL.createObjectURL(blob) });
      } catch {
        setUploadNote("One photo could not be read. Use JPG, PNG or WebP.");
      }
    }
    setFiles((f) => [...f, ...next]);
  }

  const busy = pending || uploading;

  return (
    <form action={action} className="space-y-8">
      {product ? <input type="hidden" name="id" value={product.id} /> : null}
      {defaults.enquiry_id ? <input type="hidden" name="enquiry_id" value={defaults.enquiry_id} /> : null}

      <section className="rounded-2xl border border-line p-5 sm:p-6">
        <h2 className="mb-5 text-lg font-semibold">Device</h2>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="iPhone model" htmlFor="model_id">
            <Select id="model_id" name="model_id" value={modelId} onChange={(e) => setModelId(e.target.value)} required>
              <option value="">Choose…</option>
              {selectableModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.is_active ? "" : " (inactive)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Storage" htmlFor="storage_gb">
            <Select id="storage_gb" name="storage_gb" defaultValue={product?.storage_gb ?? defaults.storage_gb ?? ""} key={modelId} required>
              <option value="">Choose…</option>
              {(model?.storages ?? []).map((s) => (
                <option key={s} value={s}>
                  {formatStorage(s)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Colour" htmlFor="color">
            <Input id="color" name="color" list="model-colors" defaultValue={product?.color ?? ""} required autoComplete="off" />
            <datalist id="model-colors">
              {(model?.colors ?? []).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Battery health (%)" htmlFor="battery_health">
            <Input id="battery_health" name="battery_health" type="number" min={0} max={100} inputMode="numeric" defaultValue={product?.battery_health ?? defaults.battery_health ?? ""} />
          </Field>
          <Field label="Physical condition" htmlFor="condition">
            <Select id="condition" name="condition" defaultValue={product?.condition ?? defaults.condition ?? ""} required>
              <option value="">Choose…</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {CONDITION_LABEL[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Original parts" htmlFor="parts_status">
            <Select id="parts_status" name="parts_status" value={parts} onChange={(e) => setParts(e.target.value as typeof parts)}>
              {(Object.keys(PARTS_LABEL) as (keyof typeof PARTS_LABEL)[]).map((k) => (
                <option key={k} value={k}>
                  {PARTS_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
          {parts === "replaced" ? (
            <Field label="Replaced parts" htmlFor="replaced_parts" className="sm:col-span-2 lg:col-span-3">
              <Input id="replaced_parts" name="replaced_parts" defaultValue={product?.replaced_parts ?? defaults.replaced_parts ?? ""} placeholder="e.g. Battery (Apple service), screen" />
            </Field>
          ) : null}
          <Field label="Description (shown on the website)" htmlFor="description" className="sm:col-span-2 lg:col-span-3">
            <Textarea id="description" name="description" defaultValue={product?.description ?? ""} rows={3} />
          </Field>
        </div>
      </section>

      <section className="rounded-2xl border border-line p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">Selling price & location</h2>
        {!canEditPrices && product ? <p className="mb-4 text-xs text-grey">Only owners and managers can change selling prices.</p> : <div className="mb-4" />}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Shop" htmlFor="shop_id">
            <Select id="shop_id" name="shop_id" value={shopId} onChange={(e) => {
                setShopId(e.target.value);
                // Default the price currency to the shop's currency when adding a phone.
                const shop = shops.find((x) => x.id === e.target.value);
                if (!product && shop) setCurrency(shop.currency);
              }} required disabled={!!product}>
              <option value="">Choose…</option>
              {activeShops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.city ? ` — ${s.city}` : ""}
                </option>
              ))}
            </Select>
            {product ? <input type="hidden" name="shop_id" value={shopId} /> : null}
            {product ? <p className="text-xs text-muted">Use “Transfer” to move this phone to another shop.</p> : null}
          </Field>
          <Field label="Selling price" htmlFor="price">
            <Input id="price" name="price" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={product?.price ?? ""} required readOnly={!!product && !canEditPrices} />
          </Field>
          <Field label="Special offer price (optional)" htmlFor="offer_price">
            <Input id="offer_price" name="offer_price" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={product?.offer_price ?? ""} readOnly={!!product && !canEditPrices} />
          </Field>
          <Field label="Price currency" htmlFor="currency">
            <Select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} required disabled={!!product && !canEditPrices}>
              <option value="">Choose…</option>
              {currencies.filter((c) => c.is_active || c.code === product?.currency).map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </Select>
            {product && !canEditPrices ? <input type="hidden" name="currency" value={currency} /> : null}
          </Field>
          {product?.status !== "sold" ? (
            <Field label="Availability" htmlFor="status">
              <Select id="status" name="status" defaultValue={product?.status ?? "available"}>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
              </Select>
            </Field>
          ) : null}
          <div className="flex flex-col justify-end gap-3 pb-1 text-sm">
            <label className="flex items-center gap-3">
              <input type="checkbox" name="is_featured" defaultChecked={product?.is_featured ?? false} className="h-4 w-4 accent-white" /> Featured on the homepage
            </label>
            <label className="flex items-center gap-3">
              <input type="checkbox" name="is_published" defaultChecked={product?.is_published ?? true} className="h-4 w-4 accent-white" /> Visible on the website
            </label>
          </div>
        </div>
      </section>

      {!product ? (
        <section className="rounded-2xl border border-line p-5 sm:p-6">
          <h2 className="mb-1 text-lg font-semibold">Purchase (cost)</h2>
          <p className="mb-5 text-xs text-grey">What iZone paid for this phone. Never shown to customers; used for profit reports.</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Purchase price" htmlFor="purchase_price">
              <Input id="purchase_price" name="purchase_price" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={defaults.purchase_price ?? ""} />
            </Field>
            <Field label="Purchase currency" htmlFor="purchase_currency">
              <Select id="purchase_currency" name="purchase_currency" defaultValue={defaults.purchase_currency ?? ""} key={currency}>
                <option value="">Same as selling price</option>
                {currencies.filter((c) => c.is_active).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Bought from" htmlFor="purchase_source">
              <Select id="purchase_source" name="purchase_source" defaultValue={defaults.purchase_source ?? "supplier"}>
                <option value="supplier">Supplier</option>
                <option value="customer">Customer</option>
                <option value="trade_in">Trade-in</option>
              </Select>
            </Field>
            <Field label="Supplier / customer name" htmlFor="counterparty_name">
              <Input id="counterparty_name" name="counterparty_name" defaultValue={defaults.counterparty_name ?? ""} />
            </Field>
            <Field label="Their telephone" htmlFor="counterparty_phone">
              <Input id="counterparty_phone" name="counterparty_phone" type="tel" defaultValue={defaults.counterparty_phone ?? ""} />
            </Field>
            <Field label="Purchase date" htmlFor="purchased_at">
              <Input id="purchased_at" name="purchased_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            </Field>
            <Field label="Purchase notes" htmlFor="purchase_notes" className="sm:col-span-2 lg:col-span-3">
              <Input id="purchase_notes" name="purchase_notes" />
            </Field>
          </div>
        </section>
      ) : null}

      <section className="rounded-2xl border border-line p-5 sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">Private details</h2>
        <p className="mb-5 text-xs text-grey">Visible only in the dashboard.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="IMEI" htmlFor="imei">
            <Input id="imei" name="imei" defaultValue={product?.imei ?? ""} inputMode="numeric" autoComplete="off" />
          </Field>
          <Field label="Serial number" htmlFor="serial_number">
            <Input id="serial_number" name="serial_number" defaultValue={product?.serial_number ?? ""} autoComplete="off" />
          </Field>
          <Field label="Internal notes" htmlFor="internal_notes" className="sm:col-span-2">
            <Textarea id="internal_notes" name="internal_notes" defaultValue={product?.internal_notes ?? ""} rows={2} />
          </Field>
        </div>
      </section>

      {!product ? (
        <section className="rounded-2xl border border-line p-5 sm:p-6">
          <h2 className="mb-1 text-lg font-semibold">Photographs</h2>
          <p className="mb-5 text-xs text-grey">The first photo is used on the catalogue. Photos are resized automatically.</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {files.map((f) => (
              <div key={f.id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt="" className="h-full w-full object-cover" />
                <button type="button" aria-label="Remove photo" onClick={() => setFiles((list) => list.filter((x) => x.id !== f.id))} className="absolute end-1 top-1 rounded-full bg-black/80 p-1">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-xs text-grey hover:border-white hover:text-white">
              <ImagePlus className="h-5 w-5" /> Add photos
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        </section>
      ) : null}

      {state && !state.ok ? <Notice tone="error">{state.error}</Notice> : null}
      {state?.ok && product ? <Notice tone="success">{state.message}</Notice> : null}
      {uploadNote ? <Notice tone="error">{uploadNote}</Notice> : null}

      <div className="flex gap-3">
        <Button type="submit" variant="primary" size="lg" disabled={busy}>
          {busy ? <Spinner /> : null}
          {uploading ? "Uploading photos…" : product ? "Save changes" : "Add phone to stock"}
        </Button>
      </div>
    </form>
  );
}

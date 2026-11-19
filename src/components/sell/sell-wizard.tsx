"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ImagePlus, Search, X } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand";
import { validPhone } from "@/components/site/request-dialog";
import { Button, buttonClass, Field, Input, Notice, Select, Spinner, Textarea } from "@/components/ui";
import { convert, displayOffer, formatMoney, type RateTable } from "@/lib/currency";
import { formatStorage, whatsappLink } from "@/lib/format";
import { compressImage, randomFileName } from "@/lib/image";
import { t, type Dictionary } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { submitTradeInAction } from "@/app/[locale]/actions";
import { TRADE_IN_PHOTOS_BUCKET } from "@/lib/env";
import {
  CONDITIONS,
  FUNCTION_KEYS,
  PART_KEYS,
  type BatteryBand,
  type DeviceCondition,
  type EstimateResult,
  type FunctionKey,
  type IphoneModel,
  type PartKey,
  type PartsStatus,
  type Shop,
} from "@/lib/types";

const MAX_PHOTOS = 8;
const TOTAL_STEPS = 8;

interface Props {
  locale: string;
  intl: string;
  dict: Pick<Dictionary, "sell" | "conditions" | "conditionHelp" | "common" | "whatsapp" | "product">;
  models: IphoneModel[];
  bestPrices: Record<string, number>;
  bands: BatteryBand[];
  shops: Pick<Shop, "id" | "name" | "city" | "whatsapp">[];
  mainCurrency: string;
  displayCurrency: string;
  rates: RateTable;
  whatsappNumber: string | null;
}

type YesNo = boolean | null;
interface Photo {
  id: string;
  blob: Blob;
  preview: string;
}

export function SellWizard(props: Props) {
  const { dict, models, bestPrices, bands, shops, mainCurrency, displayCurrency, rates, intl, locale } = props;
  const s = dict.sell;

  const [step, setStep] = useState(0);
  const [query, setQuery] = useState("");
  const [modelId, setModelId] = useState<string | null>(null);
  const [storage, setStorage] = useState<number | null>(null);
  const [condition, setCondition] = useState<DeviceCondition | null>(null);
  const [battery, setBattery] = useState<string>("");
  const [functional, setFunctional] = useState<Record<FunctionKey, YesNo>>(
    () => Object.fromEntries(FUNCTION_KEYS.map((k) => [k, null])) as Record<FunctionKey, YesNo>,
  );
  const [waterDamage, setWaterDamage] = useState<YesNo>(null);
  const [otherDefects, setOtherDefects] = useState("");
  const [parts, setParts] = useState<Record<PartKey, PartsStatus | null>>(
    () => Object.fromEntries(PART_KEYS.map((k) => [k, null])) as Record<PartKey, PartsStatus | null>,
  );
  const [otherReplaced, setOtherReplaced] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [shopId, setShopId] = useState(shops.length === 1 ? shops[0].id : "");
  const [submitting, setSubmitting] = useState<null | "uploading" | "sending">(null);
  const [reference, setReference] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const model = models.find((m) => m.id === modelId) ?? null;
  const batteryValue = battery === "" ? null : Math.max(0, Math.min(100, Number.parseInt(battery, 10)));

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredModels = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? models.filter((m) => m.name.toLowerCase().includes(q)) : models;
  }, [models, query]);

  const money = (amount: number) => displayOffer(amount, mainCurrency, displayCurrency, rates, intl);
  const plainMoney = (amount: number) => {
    if (displayCurrency === mainCurrency) return formatMoney(amount, mainCurrency, intl);
    const c = convert(amount, mainCurrency, displayCurrency, rates);
    return c == null ? formatMoney(amount, mainCurrency, intl) : formatMoney(Math.round(c), displayCurrency, intl, 0);
  };

  const stepValid = [
    !!model,
    storage != null,
    condition != null,
    batteryValue != null && !Number.isNaN(batteryValue),
    FUNCTION_KEYS.every((k) => functional[k] != null) && waterDamage != null,
    PART_KEYS.every((k) => parts[k] != null),
    true,
    true,
  ];

  function go(next: number) {
    setError(null);
    setStep(next);
    if (next === 7) void loadEstimate();
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function payload() {
    return {
      model_id: modelId,
      storage_gb: storage,
      condition,
      battery_health: batteryValue,
      functional: Object.fromEntries(FUNCTION_KEYS.map((k) => [k, functional[k] ?? true])),
      water_damage: waterDamage ?? false,
      other_defects: otherDefects,
      parts: Object.fromEntries(PART_KEYS.map((k) => [k, parts[k] ?? "unknown"])),
      other_replaced: otherReplaced,
    };
  }

  async function loadEstimate() {
    setEstimating(true);
    setError(null);
    const { data, error: rpcError } = await createClient().rpc("estimate_trade_in", { p: payload() });
    setEstimating(false);
    if (rpcError) {
      setError(dict.common.error);
      return;
    }
    setEstimate(data as EstimateResult);
  }


  async function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotoError(null);
    const room = MAX_PHOTOS - photos.length;
    const next: Photo[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      try {
        const blob = await compressImage(file);
        next.push({ id: crypto.randomUUID(), blob, preview: URL.createObjectURL(blob) });
      } catch {
        setPhotoError(s.photoError);
      }
    }
    setPhotos((p) => [...p, ...next]);
  }

  const defectsList = [
    ...FUNCTION_KEYS.filter((k) => functional[k] === false).map((k) => s.deductions[`defect_${k}` as keyof typeof s.deductions]),
    ...(waterDamage ? [s.deductions.defect_water_damage] : []),
    ...(otherDefects.trim() ? [otherDefects.trim()] : []),
    ...PART_KEYS.filter((k) => parts[k] === "replaced").map((k) => s.deductions[`part_${k}` as keyof typeof s.deductions]),
  ];
  const estimateText = estimate?.available && estimate.estimate != null ? money(estimate.estimate) : dict.whatsapp.noEstimate;
  const selectedShop = shops.find((x) => x.id === shopId);
  const waLink = whatsappLink(
    selectedShop?.whatsapp || props.whatsappNumber,
    t(dict.whatsapp.tradeIn, {
      model: model?.name ?? "",
      storage: storage ? formatStorage(storage) : "",
      battery: batteryValue ?? "—",
      condition: condition ? dict.conditions[condition] : "",
      defects: defectsList.length ? defectsList.join(", ") : dict.whatsapp.noDefects,
      estimate: estimateText,
    }) + (reference ? `\nRef: ${reference}` : ""),
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2 || !validPhone(phone)) {
      setError(dict.common.error);
      return;
    }
    setError(null);
    const supabase = createClient();
    const enquiryId = crypto.randomUUID();
    const paths: string[] = [];
    try {
      if (photos.length) {
        setSubmitting("uploading");
        for (const [i, photo] of photos.entries()) {
          const path = `${enquiryId}/${randomFileName(i)}`;
          const { error: upErr } = await supabase.storage.from(TRADE_IN_PHOTOS_BUCKET).upload(path, photo.blob, {
            contentType: "image/jpeg",
            upsert: false,
          });
          if (!upErr) paths.push(path);
        }
      }
      setSubmitting("sending");
      const result = await submitTradeInAction({
        ...payload(),
        id: enquiryId,
        name: name.trim(),
        phone: phone.trim(),
        preferred_shop_id: shopId || null,
        photos: paths,
        locale,
      });
      if (!result.ok) throw new Error(result.error);
      setReference(result.reference);
      go(8);
    } catch {
      setError(dict.common.error);
    } finally {
      setSubmitting(null);
    }
  }

  function reset() {
    photos.forEach((p) => URL.revokeObjectURL(p.preview));
    setModelId(null);
    setStorage(null);
    setCondition(null);
    setBattery("");
    setFunctional(Object.fromEntries(FUNCTION_KEYS.map((k) => [k, null])) as Record<FunctionKey, YesNo>);
    setWaterDamage(null);
    setOtherDefects("");
    setParts(Object.fromEntries(PART_KEYS.map((k) => [k, null])) as Record<PartKey, PartsStatus | null>);
    setOtherReplaced("");
    setPhotos([]);
    setEstimate(null);
    setReference(null);
    setQuery("");
    go(0);
  }

  const choice = (selected: boolean) =>
    `rounded-2xl border px-5 py-4 text-start transition-colors duration-200 ${selected ? "border-white bg-white text-black" : "border-line hover:border-grey"}`;

  const bandLabel = (b: BatteryBand) => (b.min_pct === 0 ? t(s.batteryBelow, { pct: b.max_pct + 1 }) : `${b.min_pct}–${b.max_pct}%`);

  return (
    <div ref={topRef} className="scroll-mt-28">
      {step < 8 ? (
        <div className="mb-10">
          <div className="flex items-center justify-between text-xs text-grey">
            <span>{t(s.stepOf, { n: step + 1, total: TOTAL_STEPS })}</span>
            <span className="uppercase tracking-[0.18em]">{s.steps[step]}</span>
          </div>
          <div className="mt-3 h-px w-full bg-line">
            <div className="h-px bg-white transition-[width] duration-500" style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
          </div>
          {model && step > 0 && step < 7 ? (
            <p className="mt-4 text-sm text-grey">
              {model.name}
              {storage ? ` · ${formatStorage(storage)}` : ""}
              {condition && step > 2 ? ` · ${dict.conditions[condition]}` : ""}
              {batteryValue != null && step > 3 ? ` · ${batteryValue}%` : ""}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* STEP 1 — MODEL */}
      {step === 0 ? (
        <section className="animate-fade-up">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.modelTitle}</h2>
          <div className="relative mt-8">
            <Search className="pointer-events-none absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-grey" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={s.modelSearch} className="ps-11" aria-label={s.modelSearch} />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredModels.map((m) => (
              <button
                key={m.id}
                type="button"
                className={choice(modelId === m.id)}
                onClick={() => {
                  if (modelId !== m.id) setStorage(null);
                  setModelId(m.id);
                  go(1);
                }}
              >
                <span className="block font-medium">{m.name}</span>
                <span className={`mt-1 block text-xs ${modelId === m.id ? "text-black/60" : "text-grey"}`}>
                  {bestPrices[m.id] ? t(s.upTo, { price: money(bestPrices[m.id]) }) : m.storages.map(formatStorage).join(" · ")}
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* STEP 2 — STORAGE */}
      {step === 1 && model ? (
        <section className="animate-fade-up">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.storageTitle}</h2>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {model.storages.map((gb) => (
              <button
                key={gb}
                type="button"
                className={`${choice(storage === gb)} text-center text-lg font-medium`}
                onClick={() => {
                  setStorage(gb);
                  go(2);
                }}
              >
                {formatStorage(gb)}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* STEP 3 — CONDITION */}
      {step === 2 ? (
        <section className="animate-fade-up">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.conditionTitle}</h2>
          <div className="mt-8 grid gap-3">
            {CONDITIONS.map((c, i) => (
              <button
                key={c}
                type="button"
                className={`${choice(condition === c)} flex items-center gap-5`}
                onClick={() => {
                  setCondition(c);
                  go(3);
                }}
              >
                <span className={`text-sm ${condition === c ? "text-black/50" : "text-muted"}`}>{i + 1}</span>
                <span>
                  <span className="block font-semibold uppercase tracking-wide">{dict.conditions[c]}</span>
                  <span className={`mt-1 block text-sm ${condition === c ? "text-black/70" : "text-grey"}`}>{dict.conditionHelp[c]}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {/* STEP 4 — BATTERY */}
      {step === 3 ? (
        <section className="animate-fade-up">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.batteryTitle}</h2>
          <div className="mt-8 max-w-sm">
            <Field label={s.batteryExact} hint={s.batteryHelp} htmlFor="battery">
              <div className="relative">
                <Input
                  id="battery"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  value={battery}
                  onChange={(e) => setBattery(e.target.value.replace(/\D/g, "").slice(0, 3))}
                  className="pe-10 text-2xl"
                  dir="ltr"
                />
                <span className="absolute end-4 top-1/2 -translate-y-1/2 text-grey">%</span>
              </div>
            </Field>
          </div>
          {bands.length ? (
            <>
              <p className="eyebrow mt-10">{s.batteryOr}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {bands.map((b) => {
                  const selected = batteryValue != null && batteryValue >= b.min_pct && batteryValue <= b.max_pct;
                  return (
                    <button key={b.id} type="button" className={`${choice(selected)} text-center`} onClick={() => setBattery(String(b.max_pct))}>
                      {bandLabel(b)}
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {/* STEP 5 — FUNCTIONALITY */}
      {step === 4 ? (
        <section className="animate-fade-up">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.functionTitle}</h2>
          <p className="mt-3 text-grey">{s.functionLead}</p>
          <div className="mt-6 border-t border-line">
            {FUNCTION_KEYS.map((k) => (
              <YesNoRow labels={dict.common} key={k} label={s.questions[k]} value={functional[k]} onChange={(v) => setFunctional((f) => ({ ...f, [k]: v === "yes" }))} />
            ))}
            <YesNoRow labels={dict.common} label={s.questions.water_damage} value={waterDamage} onChange={(v) => setWaterDamage(v === "yes")} />
          </div>
          <div className="mt-8">
            <Field label={s.otherDefects} htmlFor="other-defects">
              <Textarea id="other-defects" value={otherDefects} maxLength={1000} onChange={(e) => setOtherDefects(e.target.value)} placeholder={s.otherDefectsPlaceholder} />
            </Field>
          </div>
        </section>
      ) : null}

      {/* STEP 6 — ORIGINAL COMPONENTS */}
      {step === 5 ? (
        <section className="animate-fade-up">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.partsTitle}</h2>
          <div className="mt-6 border-t border-line">
            {(["screen", "battery", "cameras"] as const).map((k) => (
              <YesNoRow
                labels={dict.common}
                key={k}
                label={s.partsQuestions[k]}
                value={parts[k]}
                allowUnsure
                onChange={(v) => setParts((p) => ({ ...p, [k]: v === "yes" ? "original" : v === "no" ? "replaced" : "unknown" }))}
              />
            ))}
            <YesNoRow
                labels={dict.common}
              label={s.partsQuestions.other}
              value={parts.other === null ? null : parts.other === "replaced"}
              onChange={(v) => setParts((p) => ({ ...p, other: v === "yes" ? "replaced" : "original" }))}
            />
          </div>
          {parts.other === "replaced" ? (
            <div className="mt-6">
              <Input value={otherReplaced} onChange={(e) => setOtherReplaced(e.target.value)} maxLength={500} placeholder={s.otherReplacedPlaceholder} aria-label={s.otherReplacedPlaceholder} />
            </div>
          ) : null}
        </section>
      ) : null}

      {/* STEP 7 — PHOTOS */}
      {step === 6 ? (
        <section className="animate-fade-up">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.photosTitle}</h2>
          <p className="mt-3 text-grey">{s.photosLead}</p>
          <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(p.preview);
                    setPhotos((list) => list.filter((x) => x.id !== p.id));
                  }}
                  aria-label={s.removePhoto}
                  className="absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/80 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS ? (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line text-sm text-grey transition-colors hover:border-white hover:text-white">
                <ImagePlus className="h-6 w-6" aria-hidden="true" />
                {s.addPhotos}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    void addPhotos(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
            ) : null}
          </div>
          <p className="mt-3 text-xs text-muted">{t(s.photosLimit, { n: MAX_PHOTOS })}</p>
          {photoError ? <div className="mt-4"><Notice tone="error">{photoError}</Notice></div> : null}
        </section>
      ) : null}

      {/* STEP 8 — ESTIMATE + CONTACT */}
      {step === 7 ? (
        <section className="animate-fade-up">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{s.estimateTitle}</h2>
          <p className="mt-2 text-grey">
            {model?.name} · {storage ? formatStorage(storage) : ""} · {condition ? dict.conditions[condition] : ""} · {batteryValue}%
          </p>

          <div className="mt-8 rounded-[var(--radius-card)] border border-line p-6 sm:p-8" aria-live="polite">
            {estimating ? (
              <p className="flex items-center gap-3 text-grey">
                <Spinner /> {s.calculating}
              </p>
            ) : estimate?.available ? (
              <>
                <p className="eyebrow">{s.estimate}</p>
                <p className="mt-3 text-5xl font-semibold tracking-tight sm:text-6xl" dir="ltr" data-testid="estimate-amount">
                  {displayCurrency !== mainCurrency ? "≈ " : ""}
                  {money(estimate.estimate ?? 0)}
                </p>
                {displayCurrency !== mainCurrency ? (
                  <p className="mt-1 text-sm text-muted" dir="ltr">
                    {formatMoney(estimate.estimate ?? 0, mainCurrency, intl)}
                  </p>
                ) : null}
                <dl className="mt-8 divide-y divide-line border-y border-line text-sm">
                  <div className="flex justify-between gap-4 py-3">
                    <dt className="text-grey">{s.basePrice}</dt>
                    <dd dir="ltr">{plainMoney(estimate.base_price ?? 0)}</dd>
                  </div>
                  {(estimate.deductions ?? []).map((d) => (
                    <div key={d.key} className="flex justify-between gap-4 py-3">
                      <dt className="text-grey">{s.deductions[d.key as keyof typeof s.deductions] ?? d.key}</dt>
                      <dd dir="ltr">− {plainMoney(Number(d.amount))}</dd>
                    </div>
                  ))}
                </dl>
                {estimate.inspection_required ? <p className="mt-4 text-sm text-grey">{s.inspectionNote}</p> : null}
              </>
            ) : estimate ? (
              <p className="text-lg">{s.noPrice}</p>
            ) : error ? (
              <div className="flex flex-wrap items-center gap-4">
                <Notice tone="error">{error}</Notice>
                <Button type="button" onClick={() => void loadEstimate()}>
                  {dict.common.retry}
                </Button>
              </div>
            ) : null}
            <p className="mt-6 border-t border-line pt-6 text-sm leading-relaxed text-white">{s.disclaimer}</p>
            <Link href={`/${locale}/trade-in-conditions`} className="mt-3 inline-block text-xs text-grey underline-offset-4 hover:text-white hover:underline">
              {s.conditionsLink}
            </Link>
          </div>

          <form onSubmit={submit} className="mt-10 rounded-[var(--radius-card)] border border-line p-6 sm:p-8" noValidate>
            <h3 className="text-2xl font-semibold tracking-tight">{s.contactTitle}</h3>
            <p className="mt-2 text-sm text-grey">{s.contactLead}</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label={s.preferredShop} htmlFor="ti-shop" className="sm:col-span-2">
                <Select id="ti-shop" value={shopId} onChange={(e) => setShopId(e.target.value)}>
                  <option value="">{s.anyShop}</option>
                  {shops.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.city ? `${x.name} — ${x.city}` : x.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={dict.product.name} htmlFor="ti-name">
                <Input id="ti-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={120} />
              </Field>
              <Field label={dict.product.phone} htmlFor="ti-phone">
                <Input id="ti-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" required dir="ltr" />
              </Field>
            </div>
            {error && !estimating ? <div className="mt-5"><Notice tone="error">{error}</Notice></div> : null}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button type="submit" variant="primary" size="lg" className="sm:flex-1" disabled={!!submitting || estimating || !estimate}>
                {submitting ? (
                  <>
                    <Spinner /> {submitting === "uploading" ? s.uploading : dict.common.sending}
                  </>
                ) : (
                  s.submit
                )}
              </Button>
              {waLink ? (
                <a href={waLink} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "lg", "sm:flex-1")}>
                  <WhatsAppIcon className="h-5 w-5" /> {s.whatsapp}
                </a>
              ) : null}
            </div>
          </form>
        </section>
      ) : null}

      {/* DONE */}
      {step === 8 ? (
        <section className="animate-fade-up rounded-[var(--radius-card)] border border-line p-8 text-center sm:p-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-black">
            <Check className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-6 text-3xl font-semibold tracking-tight">{s.successTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-grey" data-testid="trade-in-reference">
            {t(s.successLead, { ref: reference ?? "" })}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {waLink ? (
              <a href={waLink} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "lg")}>
                <WhatsAppIcon className="h-5 w-5" /> {s.whatsapp}
              </a>
            ) : null}
            <Button type="button" size="lg" onClick={reset}>
              {s.startOver}
            </Button>
          </div>
        </section>
      ) : null}

      {/* NAVIGATION */}
      {step > 0 && step < 8 ? (
        <div className="mt-12 flex items-center justify-between gap-4 border-t border-line pt-6">
          <Button type="button" variant="ghost" onClick={() => go(step - 1)}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" /> {dict.common.back}
          </Button>
          {step < 7 && step >= 3 ? (
            <Button type="button" variant="primary" disabled={!stepValid[step]} onClick={() => go(step + 1)}>
              {dict.common.next}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function YesNoRow({
  label,
  value,
  onChange,
  labels,
  allowUnsure = false,
}: {
  label: string;
  value: YesNo | PartsStatus | null;
  onChange: (v: "yes" | "no" | "unsure") => void;
  labels: { yes: string; no: string; notSure: string };
  allowUnsure?: boolean;
}) {
  const options = [
    { v: "yes" as const, label: labels.yes },
    { v: "no" as const, label: labels.no },
    ...(allowUnsure ? [{ v: "unsure" as const, label: labels.notSure }] : []),
  ];
  const current =
    value === null ? null : typeof value === "boolean" ? (value ? "yes" : "no") : value === "original" ? "yes" : value === "replaced" ? "no" : "unsure";
  return (
    <div className="flex flex-col gap-3 border-b border-line py-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-base">{label}</p>
      <div className="flex shrink-0 gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.v}
            type="button"
            role="radio"
            aria-checked={current === o.v}
            onClick={() => onChange(o.v)}
            className={`h-10 min-w-16 rounded-full border px-4 text-sm transition-colors ${current === o.v ? "border-white bg-white text-black" : "border-line hover:border-grey"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

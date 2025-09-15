'use client';
import React, { useMemo, useState } from "react";
import Field from "@/components/inputs/Field";
import NumberField from "@/components/inputs/NumberField";
import SelectField from "@/components/inputs/SelectField";
import {
  RESTAURANT_TYPES,
  ENTITY_TYPES,
  CUISINE_OPTIONS,
  DEFAULT_HARDWARE_PRICING,
} from "@/lib/constants";
import { currency, toNum, triggerDownload, exportCsvTab } from "@/lib/utils";
import { computeDerived } from "@/lib/compute";

export default function Wizard() {
  const [step, setStep] = useState(0);

  // Business profile
  const [biz, setBiz] = useState({
    entityType: "LLC",
    locations: 1,
    type: "fastcasual",
    cuisine: "Other",
    cuisineOther: "NONE",
    openDate: "",
  });

  // Processing model (defaults: flat 4%)
  const [processing, setProcessing] = useState({
    monthlyVolume: 80000,
    averageTicket: 38,
    cardPresentPct: 0.95,
    pricingModel: "flatrate" as "interchange" | "flatrate" | "surcharge",
    // IC+
    markupBps: 35,
    markupPerItem: 0.06,
    // Flat
    flatPct: 0.04,               // stored as 0–1
    flatPctEditing: undefined as string | undefined, // UI helper
    flatPerItem: 0.1,
    // Common
    monthlyFeesToMerchant: 0,
    useDefaultCosts: true,
    customCosts: { basePct: 0.019, assessmentsPct: 0.0013, perItem: 0.1 },
    // Agent share (0–1)
    agentShare: 0.5,
    agentShareEditing: undefined as string | undefined,
    // Surcharge specifics
    creditPct: 0.60,          // portion of volume that is credit (0–1)
    debitBps: 35,             // 35 bps on debit
    debitPerItem: 0,          // $0.00 per debit item
    creditSurchargePct: 3,    // 3% surcharge on credit
  });

  // Hardware (defaults per your notes)
  const [hardware, setHardware] = useState({
    posTerminals: 1,
    terminalOnlyUnits: 0,
    receiptPrinters: 0,
    kitchenPrinters: 1,
    handhelds: 2,
    kdsUnits: 1,
    cashDrawers: 0,
    scanners: 0,
    pricing: { ...DEFAULT_HARDWARE_PRICING },
    amortTermMonths: 30,
    includeSoftwareInCoverage: true,
    softwareMonthly: 0,
    bufferPct: 0.3,
    includeInstallTraining: true,
  });

  const [notes, setNotes] = useState("");

  const steps = [
    { key: "intro",   title: "Welcome",               blurb: "A quick, focused intro to gather defaults." },
    { key: "basics",  title: "Business Basics",       blurb: "Tell me about the concept and trade profile." },
    { key: "hardware",title: "Hardware Needs",        blurb: "Let's map stations and back-of-house." },
    { key: "pricing", title: "Processing & Pricing",  blurb: "How are fees structured today?" },
    { key: "whatif",  title: "What-if Sliders",       blurb: "Adjust annual volume, average ticket, and agent share to see impact." },
    { key: "review",  title: "Review & Export",       blurb: "We’ll calculate coverage and next steps." }
  ];

  const derived = useMemo(
    () => computeDerived(biz as any, processing as any, hardware as any),
    [biz, processing, hardware]
  );

  function makeLead() {
    return {
      EntityType: biz.entityType,
      Locations: biz.locations,
      RestaurantType: RESTAURANT_TYPES.find((t) => t.id === biz.type)?.name || biz.type,
      Cuisine: biz.cuisine,
      OpenDate: biz.openDate,
      MonthlyVolume: processing.monthlyVolume,
      AverageTicket: processing.averageTicket,
      EstTransactions: derived.tx,
      CardPresentPct: processing.cardPresentPct,
      PricingModel: processing.pricingModel,
      MarkupBps: processing.markupBps,
      MarkupPerItem: processing.markupPerItem,
      FlatPct: processing.flatPct,
      FlatPerItem: processing.flatPerItem,
      MonthlyFeesToMerchant: processing.monthlyFeesToMerchant,
      CostPctUsed: derived.costPct,
      NetworkPerItemCost: derived.blendedPerItem,
      MerchantFeesCollected: derived.merchantFees,
      NetworkCosts: derived.networkCosts,
      GrossProfit: derived.grossProfit,
      POS_Terminals: hardware.posTerminals,
      TerminalOnly_Units: hardware.terminalOnlyUnits,
      Receipt_Printers: hardware.receiptPrinters,
      Kitchen_Printers: hardware.kitchenPrinters,
      Handhelds: hardware.handhelds,
      KDS_Units: hardware.kdsUnits,
      CashDrawers: hardware.cashDrawers,
      Scanners: hardware.scanners,
      UnitCost_FullStation_First: hardware.pricing.posTerminalFirst,
      UnitCost_FullStation_Additional: hardware.pricing.posTerminalAdditional,
      UnitCost_TerminalOnly: hardware.pricing.terminalOnly,
      UnitCost_ReceiptPrinter: hardware.pricing.receiptPrinter,
      UnitCost_KitchenPrinter: hardware.pricing.kitchenPrinter,
      UnitCost_Tablet: hardware.pricing.handheld,
      UnitCost_KDSController: hardware.pricing.kds,
      UnitCost_CashDrawer: hardware.pricing.cashDrawer,
      UnitCost_Scanner: hardware.pricing.scanner,
      InstallTraining: hardware.pricing.installTraining,
      IncludeInstallTraining: hardware.includeInstallTraining,
      HardwareCAPEX: derived.capex,
      HardwareAmortizedMonthly: derived.amort,
      AmortTermMonths: hardware.amortTermMonths,
      SoftwareMonthly: derived.softwareMonthly,
      IncludeSoftwareInCoverage: hardware.includeSoftwareInCoverage,
      BufferPct: hardware.bufferPct,
      CoverageTargetMonthly: derived.coverageTarget,
      RequiredWithBuffer: derived.required,
      Eligibility: derived.eligibility,
      CreditMixPct: Math.round(Number(processing.creditPct||0)*100),
      DebitBps: processing.debitBps,
      DebitPerItem: processing.debitPerItem,
      CreditSurchargePct: processing.creditSurchargePct,
      SurchargeRevenue: derived.surchargeRevenue,
      AgentSharePct: Math.round(Number(processing.agentShare||0)*100),
      AgentProfit: derived.agentProfit,
      NetAgentProfit: derived.agentProfit - derived.coverageTarget,
      Notes: notes,
    };
  }

  async function exportResults() {
    const safeName = "onepos_lead";
    const lead = makeLead();
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.utils.book_new();
      const sheet = XLSX.utils.json_to_sheet([lead]);
      XLSX.utils.book_append_sheet(wb, sheet, "ONEPOS Lead");
      const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([wbout], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      triggerDownload(blob, `${safeName}.xlsx`);
    } catch {
      const headers = Object.keys(lead);
      const values = headers.map((h) => JSON.stringify((lead as any)[h] ?? ""));
      const csv = headers.join(",") + "\n" + values.join(",");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      triggerDownload(blob, `${safeName}.csv`);
    }
  }

  function StepHeader() {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-black">ONEPOS Hardware Eligibility</h1>
        </div>
        <span className="text-sm text-black rounded-full bg-gray-100 px-2 py-1">
          Step {step + 1} / {steps.length}
        </span>
      </div>
    );
  }

  const view = (() => {
    switch (steps[step].key) {
      case "intro":
        return (
          <div className="space-y-6">
            <p className="text-base md:text-lg text-black">
              I’ll ask a few focused questions about volume, average ticket, concept, and hardware layout. Then I’ll estimate
              processing profitability to see if a <b>no-cost</b> or <b>low-cost</b> hardware placement is viable.
            </p>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Restaurant Type">
                <SelectField
                  value={biz.type}
                  onChange={(v) => setBiz({ ...biz, type: v })}
                  options={RESTAURANT_TYPES as any}
                />
              </Field>
              <Field label="Est. Monthly Card Volume ($)">
                <NumberField
                  value={processing.monthlyVolume}
                  onChange={(v) => setProcessing({ ...processing, monthlyVolume: toNum(v, 0) })}
                  onCommit={(v) => setProcessing({ ...processing, monthlyVolume: toNum(v, 0) })}
                />
              </Field>
              <Field label="Average Ticket ($)">
                <NumberField
                  value={processing.averageTicket}
                  onChange={(v) => setProcessing({ ...processing, averageTicket: toNum(v, 0) })}
                  onCommit={(v) => setProcessing({ ...processing, averageTicket: toNum(v, 0) })}
                />
              </Field>
            </div>
          </div>
        );

      case "basics":
        return (
          <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Entity Type">
                <SelectField
                  value={biz.entityType || "LLC"}
                  onChange={(v) => setBiz({ ...biz, entityType: v })}
                  options={ENTITY_TYPES as any}
                />
              </Field>
              <Field label="Restaurant Type">
                <SelectField
                  value={biz.type}
                  onChange={(v) => setBiz({ ...biz, type: v })}
                  options={RESTAURANT_TYPES as any}
                />
              </Field>
              <Field label="Cuisine / Concept">
                <SelectField
                  value={biz.cuisine}
                  onChange={(v) => setBiz({ ...biz, cuisine: v })}
                  options={CUISINE_OPTIONS as any}
                />
              </Field>
              <Field label="Locations">
                <NumberField
                  value={biz.locations}
                  onChange={(v) => setBiz({ ...biz, locations: toNum(v, 0) })}
                  onCommit={(v) => setBiz({ ...biz, locations: toNum(v, 0) })}
                />
              </Field>
              <Field label="Opening Date (if new)">
                <input
                  className="h-12 rounded-lg border border-gray-400 px-3 text-[16px] bg-white text-black placeholder-gray-500 caret-black shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  type="date"
                  value={biz.openDate}
                  onChange={(e) => setBiz({ ...biz, openDate: (e.target as HTMLInputElement).value })}
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <Field label="Monthly Card Volume ($)">
                <NumberField
                  value={processing.monthlyVolume}
                  onChange={(v) => setProcessing({ ...processing, monthlyVolume: toNum(v, 0) })}
                  onCommit={(v) => setProcessing({ ...processing, monthlyVolume: toNum(v, 0) })}
                />
              </Field>
              <Field label="Average Ticket ($)">
                <NumberField
                  value={processing.averageTicket}
                  onChange={(v) => setProcessing({ ...processing, averageTicket: toNum(v, 0) })}
                  onCommit={(v) => setProcessing({ ...processing, averageTicket: toNum(v, 0) })}
                />
              </Field>
              <Field label="Card-Present Mix (%)">
                <NumberField
                  value={Math.round(Number(processing.cardPresentPct || 0) * 100)}
                  onChange={(v) => setProcessing({ ...processing, cardPresentPct: toNum(v, 0) / 100 })}
                  onCommit={(v) =>
                    setProcessing({
                      ...processing,
                      cardPresentPct: Math.min(100, Math.max(0, toNum(v, 0))) / 100,
                    })
                  }
                />
              </Field>
              <Field label="Est. Transactions / Month">
                <div className="h-12 rounded-lg border px-3 flex items-center bg-gray-50 text-[16px]">
                  {derived.tx.toLocaleString()}
                </div>
              </Field>
            </div>
          </div>
        );

      case "hardware":
        return (
          <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-4">
              {(
                [
                  ["posTerminals", "Full Terminal Stations"],
                  ["terminalOnlyUnits", "Terminal-Only Units"],
                  ["receiptPrinters", "Receipt Printers"],
                  ["kitchenPrinters", "Kitchen Printers"],
                  ["handhelds", "Tablets (w/ reader)"],
                  ["kdsUnits", "KDS Controllers"],
                  ["cashDrawers", "Cash Drawers"],
                  ["scanners", "Barcode Scanners"],
                ] as any
              ).map(([k, label]: any) => (
                <Field key={k} label={label}>
                  <NumberField
                    value={(hardware as any)[k]}
                    onChange={(v) => setHardware({ ...hardware, [k]: toNum(v, 0) } as any)}
                    onCommit={(v) => setHardware({ ...hardware, [k]: toNum(v, 0) } as any)}
                  />
                </Field>
              ))}
            </div>

            <div className="grid md:grid-cols-4 gap-4 p-4 rounded-lg border bg-gray-50">
              {Object.entries(hardware.pricing).map(([k, v]) => {
                const nice = k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
                const isInstall = k === "installTraining";
                return (
                  <div
                    key={k}
                    className={isInstall ? "p-3 rounded-lg border border-red-500 bg-red-50" : ""}
                  >
                    <Field
                      label={
                        isInstall ? <span className="text-red-700">Install &amp; Training</span> : nice
                      }
                    >
                      <div className="flex items-center gap-3">
                        <NumberField
                          value={v as any}
                          onChange={(val) =>
                            setHardware({
                              ...hardware,
                              pricing: { ...hardware.pricing, [k]: toNum(val, 0) },
                            })
                          }
                          onCommit={(val) =>
                            setHardware({
                              ...hardware,
                              pricing: { ...hardware.pricing, [k]: toNum(val, 0) },
                            })
                          }
                        />
                        {isInstall && (
                          <label className="flex items-center gap-2 text-sm text-red-700">
                            <input
                              type="checkbox"
                              checked={!!hardware.includeInstallTraining}
                              onChange={(e) =>
                                setHardware({
                                  ...hardware,
                                  includeInstallTraining: (e.target as HTMLInputElement).checked,
                                })
                              }
                            />
                            <span>Include in CAPEX</span>
                          </label>
                        )}
                      </div>
                    </Field>
                  </div>
                );
              })}
            </div>

            <div className="grid md:grid-cols-4 gap-4">
              <Field label="Amortization Term (months)">
                <select
                  className="h-10 rounded-lg border px-3 bg-white text-black"
                  value={hardware.amortTermMonths}
                  onChange={(e) =>
                    setHardware({
                      ...hardware,
                      amortTermMonths: toNum((e.target as HTMLSelectElement).value, 30),
                    })
                  }
                >
                  {[24, 30, 36, 48].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Include Software in Coverage">
                <div className="h-12 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!hardware.includeSoftwareInCoverage}
                    onChange={(e) =>
                      setHardware({
                        ...hardware,
                        includeSoftwareInCoverage: (e.target as HTMLInputElement).checked,
                      })
                    }
                  />
                  <span className="text-base md:text-lg text-black font-medium">
                    Adds software monthly to coverage target
                  </span>
                </div>
              </Field>

              <Field label="Software Monthly ($)">
                <div className="h-12 rounded-lg border px-3 flex items-center bg-gray-50 text-[16px]">
                  {currency(derived.softwareMonthly)}
                </div>
                <div className="text-sm md:text-base text-gray-800">
                  Auto: $59 per Full/Terminal-Only/Tablet; $59 for first KDS + $10 each add'l.
                </div>
              </Field>

              <Field label="Risk Buffer (%)">
                <NumberField
                  value={Math.round(Number(hardware.bufferPct || 0) * 100)}
                  onChange={(v) => setHardware({ ...hardware, bufferPct: toNum(v, 0) / 100 })}
                  onCommit={(v) =>
                    setHardware({
                      ...hardware,
                      bufferPct: Math.min(100, Math.max(0, toNum(v, 0))) / 100,
                    })
                  }
                />
              </Field>
            </div>

            <div className="grid md:grid-cols-4 gap-4 p-4 rounded-lg border bg-gray-50">
              <Stat label="Hardware CAPEX" value={currency(derived.capex)} />
              <Stat label="Amortized / Month" value={currency(derived.amort)} />
              <Stat label="Coverage Target" value={currency(derived.coverageTarget)} />
              <Stat label="Required w/ Buffer" value={currency(derived.required)} />
            </div>
          </div>
        );

      case "pricing":
        return (
          <div className="grid gap-6">
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Pricing Model">
                <select
                  className="h-10 rounded-lg border px-3 bg-white text-black"
                  value={processing.pricingModel}
                  onChange={(e) =>
                    setProcessing({
                      ...processing,
                      pricingModel: (e.target as HTMLSelectElement).value as any,
                    })
                  }
                >
                  <option value="interchange">Interchange-Plus (IC+)</option>
                  <option value="flatrate">Flat Rate</option>
                  <option value="surcharge">Surcharge (credit 3%, debit 35 bps)</option>
                </select>
              </Field>

              <Field label="Monthly Fees Billed via Processor ($)">
                <NumberField
                  value={processing.monthlyFeesToMerchant}
                  onChange={(v) => setProcessing({ ...processing, monthlyFeesToMerchant: toNum(v, 0) })}
                  onCommit={(v) =>
                    setProcessing({
                      ...processing,
                      monthlyFeesToMerchant: toNum(v, 0),
                    })
                  }
                />
              </Field>
            </div>

            {processing.pricingModel === "interchange" ? (
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Markup (bps)">
                  <NumberField
                    value={processing.markupBps}
                    onChange={(v) => setProcessing({ ...processing, markupBps: toNum(v, 0) })}
                    onCommit={(v) => setProcessing({ ...processing, markupBps: toNum(v, 0) })}
                  />
                </Field>
                <Field label="Per-Item Markup ($)">
                  <NumberField
                    value={processing.markupPerItem}
                    onChange={(v) => setProcessing({ ...processing, markupPerItem: toNum(v, 0) })}
                    onCommit={(v) => setProcessing({ ...processing, markupPerItem: toNum(v, 0) })}
                  />
                </Field>
                <Field label="Card-Present Mix (%)">
                  <NumberField
                    value={Math.round(Number(processing.cardPresentPct || 0) * 100)}
                    onChange={(v) => setProcessing({ ...processing, cardPresentPct: toNum(v, 0) / 100 })}
                    onCommit={(v) =>
                      setProcessing({
                        ...processing,
                        cardPresentPct: Math.min(100, Math.max(0, toNum(v, 0))) / 100,
                      })
                    }
                  />
                </Field>
              </div>
            ) : processing.pricingModel === "flatrate" ? (
              <div className="grid md:grid-cols-3 gap-4">
                <Field label="Flat %">
                  <NumberField
                    value={
                      processing.flatPctEditing ??
                      (Number(processing.flatPct) * 100).toString()
                    }
                    onChange={(v) => setProcessing({ ...processing, flatPctEditing: v })}
                    onCommit={(v) => {
                      const num = Math.min(100, Math.max(0, toNum(v, 0)));
                      setProcessing({ ...processing, flatPct: num / 100, flatPctEditing: undefined });
                    }}
                  />
                </Field>
                <Field label="Per-Item ($)">
                  <NumberField
                    value={processing.flatPerItem}
                    onChange={(v) => setProcessing({ ...processing, flatPerItem: toNum(v, 0) })}
                    onCommit={(v) => setProcessing({ ...processing, flatPerItem: toNum(v, 0) })}
                  />
                </Field>
                <Field label="Card-Present Mix (%)">
                  <NumberField
                    value={Math.round(Number(processing.cardPresentPct || 0) * 100)}
                    onChange={(v) => setProcessing({ ...processing, cardPresentPct: toNum(v, 0) / 100 })}
                    onCommit={(v) =>
                      setProcessing({
                        ...processing,
                        cardPresentPct: Math.min(100, Math.max(0, toNum(v, 0))) / 100,
                      })
                    }
                  />
                </Field>
              </div>
            ) : null}

            {processing.pricingModel === "surcharge" && (
              <div className="grid md:grid-cols-4 gap-4">
                <Field label="Credit Mix (%)">
                  <NumberField
                    value={Math.round(Number(processing.creditPct || 0) * 100).toString()}
                    onChange={(v) => setProcessing({ ...processing, creditPct: toNum(v, 60) / 100 })}
                    onCommit={(v) =>
                      setProcessing({
                        ...processing,
                        creditPct: Math.min(100, Math.max(0, toNum(v, 60))) / 100,
                      })
                    }
                  />
                </Field>
                <Field label="Debit Fee (bps)">
                  <NumberField
                    value={String(processing.debitBps ?? 35)}
                    onChange={(v) => setProcessing({ ...processing, debitBps: toNum(v, 35) })}
                    onCommit={(v) =>
                      setProcessing({
                        ...processing,
                        debitBps: Math.max(0, Math.round(toNum(v, 35))),
                      })
                    }
                  />
                </Field>
                <Field label="Debit Per-Item ($)">
                  <NumberField
                    value={String(processing.debitPerItem ?? 0)}
                    onChange={(v) => setProcessing({ ...processing, debitPerItem: toNum(v, 0) })}
                    onCommit={(v) =>
                      setProcessing({
                        ...processing,
                        debitPerItem: Math.max(0, toNum(v, 0)),
                      })
                    }
                  />
                </Field>
                <Field label="Credit Surcharge (%)">
                  <NumberField
                    value={String(processing.creditSurchargePct ?? 3)}
                    onChange={(v) => setProcessing({ ...processing, creditSurchargePct: toNum(v, 3) })}
                    onCommit={(v) =>
                      setProcessing({
                        ...processing,
                        creditSurchargePct: Math.max(0, toNum(v, 3)),
                      })
                    }
                  />
                </Field>
              </div>
            )}

            <div className="grid md:grid-cols-6 gap-4 p-4 rounded-lg border bg-gray-50">
              <Stat label="Est. Merchant Fees" value={currency(derived.merchantFees)} />
              <Stat label="Est. Network Costs" value={currency(derived.networkCosts)} />
              <Stat label="Gross Profit" value={currency(derived.grossProfit)} />
              {processing.pricingModel === "surcharge" && (
                <Stat label="Surcharge Revenue" value={currency(derived.surchargeRevenue || 0)} />
              )}
              <Stat label="Transactions" value={derived.tx.toLocaleString()} />
              <Stat label="Agent Profit" value={currency(derived.agentProfit)} />
            </div>

            <div className="grid md:grid-cols-4 gap-4 p-4 rounded-lg border bg-gray-50">
              <Stat label="Hardware CAPEX" value={currency(derived.capex)} />
              <Stat label="Amortized / Month" value={currency(derived.amort)} />
              <Stat label="Coverage Target" value={currency(derived.coverageTarget)} />
              <Stat label="Required w/ Buffer" value={currency(derived.required)} />
            </div>
          </div>
        );

      case "whatif":
        return (
          <div className="grid gap-6">
            <div className="grid md:grid-cols-3 gap-6 p-4 rounded-lg border bg-gray-50">
              <Field label="Annual Volume ($)">
                <div className="space-y-2">
                  <div className="text-sm text-gray-800">
                    {currency(Math.round(Number(processing.monthlyVolume || 0) * 12))}
                  </div>
                  <input
                    type="range"
                    min={12000}
                    max={5000000}
                    step={1000}
                    value={Math.round(Number(processing.monthlyVolume || 0) * 12)}
                    onChange={(e) =>
                      setProcessing({
                        ...processing,
                        monthlyVolume: Math.max(0, Number((e.target as HTMLInputElement).value)) / 12,
                      })
                    }
                    className="w-full"
                  />
                </div>
              </Field>

              <Field label="Average Ticket ($)">
                <div className="space-y-2">
                  <div className="text-sm text-gray-800">
                    ${Number(processing.averageTicket || 0).toFixed(0)}
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    step={1}
                    value={Number(processing.averageTicket || 0)}
                    onChange={(e) =>
                      setProcessing({
                        ...processing,
                        averageTicket: Number((e.target as HTMLInputElement).value),
                      })
                    }
                    className="w-full"
                  />
                </div>
              </Field>

              <Field label="Agent Revenue Share (%)">
                <div className="space-y-2">
                  <div className="text-sm text-gray-800">
                    {Math.round(Number(processing.agentShare || 0) * 100)}%
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={Math.round(Number(processing.agentShare || 0) * 100)}
                    onChange={(e) =>
                      setProcessing({
                        ...processing,
                        agentShare: Math.max(0.1, Number((e.target as HTMLInputElement).value) / 100),
                      })
                    }
                    className="w-full"
                  />
                </div>
              </Field>
            </div>

            <div className="grid md:grid-cols-6 gap-4 p-4 rounded-lg border bg-gray-50">
              <Stat label="Est. Merchant Fees" value={currency(derived.merchantFees)} />
              <Stat label="Est. Network Costs" value={currency(derived.networkCosts)} />
              <Stat label="Gross Profit" value={currency(derived.grossProfit)} />
              {processing.pricingModel === "surcharge" && (
                <Stat label="Surcharge Revenue" value={currency(derived.surchargeRevenue || 0)} />
              )}
              <Stat label="Transactions" value={derived.tx.toLocaleString()} />
              <Stat label="Agent Profit" value={currency(derived.agentProfit)} />
              <Stat label="Required w/ Buffer" value={currency(derived.required)} />
            </div>

            <div className="grid md:grid-cols-3 gap-4 p-4 rounded-lg border bg-gray-50">
              <Stat label="Coverage Target" value={currency(derived.coverageTarget)} />
              <div>
                <div className="text-sm text-gray-800">Net Agent Profit</div>
                <div
                  className={
                    "text-xl font-semibold " +
                    ((derived.agentProfit - derived.coverageTarget) < 0 ? "text-red-600" : "text-black")
                  }
                >
                  {currency(derived.agentProfit - derived.coverageTarget)}
                </div>
              </div>
              <Stat label="Eligibility" value={derived.eligibility} />
            </div>
          </div>
        );

      case "review":
        return (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4 p-4 rounded-lg border bg-gray-50">
              <Stat label="Agent Profit" value={currency(derived.agentProfit)} />
              <Stat label="Coverage Target" value={currency(derived.coverageTarget)} />
              <div>
                <div className="text-sm text-gray-800">Net Agent Profit (Monthly)</div>
                <div
                  className={`text-xl font-semibold ${(derived.agentProfit - derived.coverageTarget) < 0 ? 'text-red-600' : 'text-black'}`}
                >
                  {currency(derived.agentProfit - derived.coverageTarget)}
                </div>
              </div>
            </div>

            {(derived.agentProfit - derived.coverageTarget) > 0 ? (
              <div className="p-3 rounded-md bg-green-50 text-green-700 text-sm">
                The agent can cover the monthly hardware &amp; software cost and still retain a profit.
              </div>
            ) : (
              <div className="p-3 rounded-md bg-amber-50 text-amber-700 text-sm">
                At the current share, monthly agent profit does not fully cover the hardware &amp; software cost.
              </div>
            )}

            {!hardware.includeInstallTraining && (
              <div className="p-3 rounded-md bg-rose-50 text-rose-700 text-sm">
                Note: Install &amp; Training is excluded from CAPEX and must be paid separately by the Merchant.
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={exportResults}
                className="h-12 px-5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Export to Excel
              </button>
              <button
                onClick={() => exportCsvTab(makeLead(), "onepos_lead.csv")}
                className="h-12 px-5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Export CSV (open tab)
              </button>
              <button
                onClick={() => setStep(0)}
                className="h-12 px-6 rounded-lg bg-blue-600 text-white"
              >
                Start Over
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  })();

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8">
      <StepHeader />
      <div className="mt-6 p-4 md:p-6 rounded-xl border bg-white text-black shadow-sm">
        {view}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="h-12 px-5 rounded-lg bg-blue-600 text-white disabled:opacity-50"
        >
          Back
        </button>

        <div className="flex items-center gap-3">
          <input
            className="h-12 w-80 rounded-lg border border-gray-300 px-3 text-[16px] bg-white text-black placeholder-gray-500 caret-black"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes((e.target as HTMLInputElement).value)}
          />
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="h-12 px-6 rounded-lg bg-blue-600 text-white"
            >
              Next
            </button>
          ) : (
            <button onClick={() => setStep(0)} className="h-12 px-6 rounded-lg bg-blue-600 text-white">
              Start Over
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-gray-800">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}

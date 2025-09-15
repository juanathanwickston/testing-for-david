import { computeDerived } from "../lib/compute";

test("basic math holds", () => {
  const biz = { type: "fastcasual" } as any;
  const processing = { monthlyVolume: 60000, averageTicket: 30, cardPresentPct: 0.9, pricingModel: "flatrate", flatPct: 0.04, flatPerItem: 0.1, monthlyFeesToMerchant: 0, agentShare: 0.5 } as any;
  const hardware = { posTerminals: 1, terminalOnlyUnits: 0, receiptPrinters: 0, kitchenPrinters: 1, handhelds: 0, kdsUnits: 0, cashDrawers: 0, scanners: 0, pricing: { posTerminalFirst: 2999, posTerminalAdditional: 2499, terminalOnly: 1495, handheld: 800, kitchenPrinter: 425, receiptPrinter: 0, kds: 675, cashDrawer: 149, scanner: 0, installTraining: 995 }, amortTermMonths: 30, includeSoftwareInCoverage: true, bufferPct: 0.3, includeInstallTraining: true } as any;
  const d = computeDerived(biz, processing, hardware);
  expect(d.tx).toBe(Math.round(60000/30));
  expect(d.grossProfit).toBeGreaterThanOrEqual(0);
  expect(typeof d.eligibility).toBe("string");
});

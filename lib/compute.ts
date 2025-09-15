import { clamp01, toNum } from "./utils";
import { DEFAULT_COST_ASSUMPTIONS } from "./constants";

export function computeDerived(biz: any, processing: any, hardware: any) {
  const vol = toNum(processing.monthlyVolume, 0);
  const avg = Math.max(1, toNum(processing.averageTicket, 1));
  const tx = Math.max(1, Math.round(vol / avg));

  const cpRaw = toNum(processing.cardPresentPct, 0.95);
  const cp = cpRaw > 1 ? clamp01(cpRaw / 100) : clamp01(cpRaw);

  const base = processing.useDefaultCosts
    ? DEFAULT_COST_ASSUMPTIONS[biz.type] || DEFAULT_COST_ASSUMPTIONS["fastcasual"]
    : {
        basePct: toNum(processing.customCosts.basePct, 0.019),
        assessmentsPct: toNum(processing.customCosts.assessmentsPct, 0.0013),
        perItem: toNum(processing.customCosts.perItem, 0.10),
      };

  const blendedPerItem = base.perItem * (0.8 * cp + 1 * (1 - cp));
  const costPct = (base.basePct + base.assessmentsPct) * (0.85 * cp + 1 * (1 - cp));

  let merchantFees = 0;
  let surchargeRevenue = 0;

  if (processing.pricingModel === "interchange") {
    merchantFees =
      vol * (costPct + toNum(processing.markupBps) / 10000) +
      tx * (blendedPerItem + toNum(processing.markupPerItem)) +
      toNum(processing.monthlyFeesToMerchant);
  } else if (processing.pricingModel === "flatrate") {
    merchantFees =
      vol * toNum(processing.flatPct) +
      tx * toNum(processing.flatPerItem) +
      toNum(processing.monthlyFeesToMerchant);
  } else if (processing.pricingModel === "surcharge") {
    const creditPct = clamp01(toNum(processing.creditPct, 0.6));
    const debitPct = 1 - creditPct;
    const debitRate = toNum(processing.debitBps, 35) / 10000;
    const debitPerItem = toNum(processing.debitPerItem, 0);
    const creditSurcharge = toNum(processing.creditSurchargePct, 3) / 100;

    merchantFees = vol * debitPct * debitRate + tx * debitPct * debitPerItem + toNum(processing.monthlyFeesToMerchant);
    surchargeRevenue = vol * creditPct * creditSurcharge;
  }

  const networkCosts = vol * costPct + tx * blendedPerItem;
  const grossProfit = Math.max(0, (merchantFees + surchargeRevenue) - networkCosts);

  const agentShare = clamp01(toNum(processing.agentShare, 0.5));
  const agentProfit = grossProfit * agentShare;

  const p = hardware.pricing;
  const posCount = toNum(hardware.posTerminals, 0);
  const capex =
    (hardware.includeInstallTraining ? toNum(p.installTraining) : 0) +
    (posCount > 0 ? toNum(p.posTerminalFirst) + Math.max(0, posCount - 1) * toNum(p.posTerminalAdditional) : 0) +
    toNum(hardware.terminalOnlyUnits) * toNum(p.terminalOnly) +
    toNum(hardware.receiptPrinters) * toNum(p.receiptPrinter) +
    toNum(hardware.kitchenPrinters) * toNum(p.kitchenPrinter) +
    toNum(hardware.handhelds) * toNum(p.handheld) +
    toNum(hardware.kdsUnits) * toNum(p.kds) +
    toNum(hardware.cashDrawers) * toNum(p.cashDrawer) +
    toNum(hardware.scanners) * toNum(p.scanner);

  const amort = capex / Math.max(1, toNum(hardware.amortTermMonths, 30));
  const kdsCount = toNum(hardware.kdsUnits, 0);
  const softwareMonthly = 59 * (toNum(hardware.posTerminals,0) + toNum(hardware.terminalOnlyUnits,0) + toNum(hardware.handhelds,0)) + (kdsCount > 0 ? 59 + Math.max(0, kdsCount - 1) * 10 : 0);
  const coverageTarget = amort + (hardware.includeSoftwareInCoverage ? softwareMonthly : 0);
  const required = coverageTarget * (1 + toNum(hardware.bufferPct, 0.3));

  let eligibility = "Review";
  if (grossProfit >= required) eligibility = "Eligible: No-Cost Hardware";
  else if (grossProfit >= coverageTarget * 0.6) eligibility = "Eligible: Low-Cost / Subsidized";
  else eligibility = "Not Eligible (Revise Deal)";

  return { tx, costPct, blendedPerItem, merchantFees, networkCosts, grossProfit, capex, amort, softwareMonthly, coverageTargetNoSoftware: amort, coverageTarget, required, eligibility, agentProfit, surchargeRevenue };
}

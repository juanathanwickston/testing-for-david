export const currency = (n: number | string) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$0.00";
  return num.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 2 });
};
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const toNum = (v: any, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const triggerDownload = (blob: Blob, filename: string) => {
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener noreferrer";
    const supports = ("download" in (HTMLAnchorElement.prototype as any));
    if (supports) {
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    } else {
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }
  } catch (e) {
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const opened = window.open(reader.result as string, "_blank");
        if (!opened) alert("Pop-up blocked. Please allow pop-ups to download the file.");
      };
      reader.readAsDataURL(blob);
    } catch (_) {
      alert("Download was blocked by the browser. Please allow downloads/pop-ups for this page.");
    }
  }
};

export function exportCsvTab(lead: Record<string, any>, filename: string) {
  try {
    const headers = Object.keys(lead);
    const values = headers.map((h) => JSON.stringify(lead[h] ?? ""));
    const csv = headers.join(",") + "\n" + values.join(",");
    const dataUri = "data:text/csv;charset=utf-8," + encodeURIComponent(csv);
    const a = document.createElement("a");
    a.href = dataUri;
    a.download = filename || "onepos_lead.csv";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    console.error(e);
    alert("Couldn't open CSV in a new tab. Use Export to Excel instead.");
  }
}

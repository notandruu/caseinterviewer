export type CaseStyle = "interviewer_led" | "candidate_led" | "hybrid";

export function normalizeStyle(s?: string | null): CaseStyle | null {
  if (!s) return null;
  const v = s.trim().toLowerCase();
  if (["interviewer_led","interviewer-led","mckinsey","mck"].includes(v)) return "interviewer_led";
  if (["candidate_led","candidate-led","bcg","bain"].includes(v)) return "candidate_led";
  if (["hybrid"].includes(v)) return "hybrid";
  return null;
}

export function inferStyleFromFirm(firm?: string | null): CaseStyle | null {
  if (!firm) return null;
  const f = firm.trim().toLowerCase();
  if (["mckinsey","mck","mckinsey & company"].includes(f)) return "interviewer_led";
  if (["bcg","boston consulting group","bain","bain & company"].includes(f)) return "candidate_led";
  return null;
}

export function resolveCaseStyle(opts: {
  override?: string | null;
  varsStyle?: string | null;
  firm?: string | null;
}): CaseStyle {
  return (
    normalizeStyle(opts.override) ||
    normalizeStyle(opts.varsStyle) ||
    inferStyleFromFirm(opts.firm) ||
    "candidate_led"
  );
}

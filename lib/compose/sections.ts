export type SectionLike = {
  id?: string;
  key?: string;
  name?: string;
  label?: string;
  default_order?: number;
};

function toKeyCandidates(x: SectionLike | string): string[] {
  if (typeof x === "string") return [x.trim().toLowerCase()];
  const keys = [x.key, x.name, x.label].filter(Boolean) as string[];
  return keys.map((k) => k.trim().toLowerCase());
}

export function normalizeLabel(s: string) {
  return s.trim().toLowerCase();
}

export function listSectionCandidates(sections: unknown): { raw: any[]; keys: string[] } {
  if (!sections) return { raw: [], keys: [] };
  const arr = Array.isArray(sections) ? sections : [];
  const keys = arr.flatMap((s) => toKeyCandidates(s as SectionLike | string));
  return { raw: arr, keys: Array.from(new Set(keys)) };
}

export function matchSectionFlexible(
  sections: unknown,
  incoming: string
): { idx: number; raw: any } | null {
  const inKey = normalizeLabel(incoming);
  const arr = Array.isArray(sections) ? sections : [];
  for (let i = 0; i < arr.length; i++) {
    const cand = toKeyCandidates(arr[i] as SectionLike | string);
    if (cand.includes(inKey)) return { idx: i, raw: arr[i] };
  }
  return null;
}

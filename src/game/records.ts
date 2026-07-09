import type {
  ArchiveEntry,
  Character,
  Dynasty,
  LibraryItem,
  LogEntry,
} from "./types";
import { ensureDynasty } from "./legacy";
import { ensurePedigree } from "./oldmoney";
import { ensureLifestyle } from "./lifestyle";
import { uid } from "./util";

// ---------------------------------------------------------------------------
// Family Library & Archives (Build 11B). The Library holds achievements; the
// Archives hold events. Both persist across generations — a dynasty is mostly
// a well-kept filing system with feelings.
// ---------------------------------------------------------------------------

export function ensureRecords(c: Character): Dynasty {
  const d = ensurePedigree(ensureDynasty(c));
  if (!d.library) d.library = [];
  if (!d.archives) d.archives = [];
  if (!d.almaMaters) d.almaMaters = [];
  if (!d.collections) d.collections = [];
  if (!d.goalsDone) d.goalsDone = [];
  if (d.unity === undefined) d.unity = 60;
  return d;
}

/** Append an archive entry (deduped by id when provided). */
export function recordArchive(
  c: Character,
  kind: string,
  text: string,
  id?: string,
) {
  const d = ensureRecords(c);
  const key = id ?? uid();
  if (d.archives!.some((a) => a.id === key)) return;
  const entry: ArchiveEntry = {
    id: key,
    generation: d.generation,
    age: c.age,
    person: c.name,
    kind,
    text,
  };
  d.archives!.push(entry);
}

/** Add a library item if its dedupe key is new. */
export function recordLibrary(
  c: Character,
  category: string,
  title: string,
  id?: string,
) {
  const d = ensureRecords(c);
  const key = id ?? `${category}:${title}:${c.name}`;
  if (d.library!.some((l) => l.id === key)) return;
  const item: LibraryItem = {
    id: key,
    category,
    title,
    person: c.name,
    generation: d.generation,
    age: c.age,
  };
  d.library!.push(item);
}

// ---------- Yearly sync: derive records from game state ----------

/**
 * Compare cheap counters against current state and record anything new. This
 * catches achievements from every path without instrumenting every event
 * site — the archivist reads the year's papers, not the family's minds.
 */
export function advanceRecords(c: Character, log: LogEntry[]) {
  void log;
  const d = ensureRecords(c);
  const sync = ensureLifestyle(c).sync;
  const bump = (key: string, current: number): number => {
    const prev = sync[key] ?? 0;
    sync[key] = current;
    return current - prev;
  };
  const seen = (key: string): boolean => {
    if (sync[key]) return true;
    sync[key] = 1;
    return false;
  };

  // --- Library: degrees ---
  for (const deg of c.edu?.degrees ?? []) {
    const where = c.university ? ` — ${c.university}` : "";
    recordLibrary(c, "Degree", `${deg}${where}`, `deg:${deg}:${c.name}`);
  }
  if (
    ["college", "gradschool", "graduated"].includes(c.education) &&
    !seen("hsdiploma")
  ) {
    recordLibrary(
      c,
      "Degree",
      `High School Diploma${c.edu.school ? ` — ${c.edu.school}` : ""}`,
      `hs:${c.name}`,
    );
  }

  // --- Library: athletics ---
  const majors = c.athlete?.majors ?? 0;
  if (majors > 0)
    recordLibrary(
      c,
      "Championship",
      `${majors} major championship${majors === 1 ? "" : "s"} (${c.athlete?.sport ?? "sport"})`,
      `majors:${c.name}`,
    );
  if (c.athlete?.hallOfFame && !seen("hof")) {
    recordLibrary(
      c,
      "Championship",
      `Hall of Fame induction — ${c.athlete.sport ?? "sport"}`,
      `hof:${c.name}`,
    );
    recordArchive(
      c,
      "championship",
      `${c.name} was inducted into the Hall of Fame.`,
      `hofA:${c.name}`,
    );
  }
  const mvps = c.athlete?.mvps ?? 0;
  if (mvps > 0)
    recordLibrary(
      c,
      "Championship",
      `${mvps} MVP award${mvps === 1 ? "" : "s"}`,
      `mvps:${c.name}`,
    );

  // --- Library: entertainment ---
  const awards = c.entertainment?.awards ?? 0;
  if (awards > 0)
    recordLibrary(
      c,
      "Award",
      `${awards} major entertainment award${awards === 1 ? "" : "s"}`,
      `ent:${c.name}`,
    );

  // --- Library: politics ---
  const wins =
    c.politics?.electionHistory?.filter((e) => e.result === "won").length ?? 0;
  if (wins > 0)
    recordLibrary(
      c,
      "Office",
      `${wins} election${wins === 1 ? "" : "s"} won`,
      `pol:${c.name}`,
    );
  const bills = c.politics?.billsPassed ?? 0;
  if (bills > 0)
    recordLibrary(
      c,
      "Office",
      `${bills} bill${bills === 1 ? "" : "s"} passed into law`,
      `bills:${c.name}`,
    );

  // --- Library: business ---
  for (const b of c.businessHub?.businesses ?? []) {
    recordLibrary(
      c,
      "Business",
      `Founded ${b.name}`,
      `biz:${b.name}:${c.name}`,
    );
  }

  // --- Library: philanthropy ---
  const f = d.foundation;
  if (f) {
    recordLibrary(c, "Philanthropy", `Founded the ${f.name}`, `fdn:${f.name}`);
    if (f.scholarships > 0)
      recordLibrary(
        c,
        "Philanthropy",
        `${f.scholarships} scholarship${f.scholarships === 1 ? "" : "s"} endowed`,
        `sch:${c.name}`,
      );
  }
  for (const b of d.namedBuildings ?? []) {
    recordLibrary(c, "Philanthropy", b.name, `bld:${b.id}`);
  }

  // --- Archives: event deltas ---
  const kids = c.children?.length ?? 0;
  if (bump("births", kids) > 0)
    recordArchive(
      c,
      "birth",
      `A child was born to ${c.name}.`,
      `birth:${c.name}:${kids}`,
    );

  const partners = c.relationships.filter((r) => r.type === "partner").length;
  if (bump("weddings", partners) > 0)
    recordArchive(
      c,
      "wedding",
      `${c.name} married.`,
      `wed:${c.name}:${partners}`,
    );

  const degCount = c.edu?.degrees?.length ?? 0;
  if (bump("degrees", degCount) > 0) {
    const latest = c.edu.degrees[c.edu.degrees.length - 1];
    recordArchive(
      c,
      "graduation",
      `${c.name} graduated: ${latest}${c.university ? ` (${c.university})` : ""}.`,
      `grad:${c.name}:${degCount}`,
    );
  }

  const title = c.job?.title ?? "";
  if (title && sync["job"] !== 1) {
    sync["job"] = 1;
    recordArchive(
      c,
      "promotion",
      `${c.name} began work as ${title}.`,
      `job:${c.name}:${title}`,
    );
  }
  const ls = c.lifestyle!;
  if (title && ls.lastJobTitle && ls.lastJobTitle !== title) {
    recordArchive(
      c,
      "promotion",
      `${c.name} became ${title}.`,
      `promo:${c.name}:${title}:${c.age}`,
    );
  }
  if (title) ls.lastJobTitle = title;

  const bizCount = c.businessHub?.businesses.length ?? 0;
  if (bump("businesses", bizCount) > 0) {
    const latest = c.businessHub!.businesses[bizCount - 1];
    recordArchive(
      c,
      "business",
      `${c.name} founded ${latest?.name ?? "a company"}.`,
      `bizA:${c.name}:${bizCount}`,
    );
  }

  if (bump("electionWins", wins) > 0)
    recordArchive(
      c,
      "politics",
      `${c.name} won an election.`,
      `polA:${c.name}:${wins}`,
    );

  if (bump("majors", majors) > 0)
    recordArchive(
      c,
      "championship",
      `${c.name} won a major championship.`,
      `chA:${c.name}:${majors}`,
    );

  if (bump("awards", awards) > 0)
    recordArchive(
      c,
      "award",
      `${c.name} won a major award.`,
      `awA:${c.name}:${awards}`,
    );

  // --- Milestones ---
  const investments =
    c.investing?.holdings.reduce((s, h) => s + h.value, 0) ?? 0;
  const worth = c.money + investments;
  if (worth >= 1_000_000_000 && !seen("billionaire")) {
    recordArchive(
      c,
      "milestone",
      `${c.name} became a billionaire.`,
      `bn:${c.name}`,
    );
    recordLibrary(c, "Business", "Billionaire", `bnL:${c.name}`);
  } else if (worth >= 100_000_000 && !seen("centimillionaire")) {
    recordArchive(
      c,
      "milestone",
      `The family fortune passed $100M under ${c.name}.`,
      `cm:${c.name}`,
    );
  }

  if (d.seat && !seen("seatlogged"))
    recordArchive(
      c,
      "estate",
      `The family holds ${d.seat.name}.`,
      `seat:${d.seat.name}:${d.generation}`,
    );
}

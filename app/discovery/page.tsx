"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Real Discovery interview (V0): a structured, deterministic multi-step form -
// not a freeform AI conversation. Being explicit about that here on purpose:
// an adaptive LLM-driven interview would need a model API key wired into a
// server route, which does not exist yet in this project. This version is
// honest about what it is, and it does the one thing that actually matters -
// it writes a real, versioned row to business_profile_versions that the
// dashboard already knows how to read.
const STEPS = [
  "pricing",
  "team_size",
  "tools",
  "goals",
  "pain_points",
  "review",
] as const;
type Step = (typeof STEPS)[number];

function toList(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function DiscoveryPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pricingNotes, setPricingNotes] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [toolsRaw, setToolsRaw] = useState("");
  const [goalsRaw, setGoalsRaw] = useState("");
  const [painPointsRaw, setPainPointsRaw] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/");
        return;
      }
      const { data: orgs, error: orgErr } = await supabase
        .from("organizations")
        .select("id")
        .limit(1);
      if (orgErr || !orgs || orgs.length === 0) {
        setError("לא נמצא ארגון משויך למשתמש הזה.");
        setChecking(false);
        return;
      }
      setOrgId(orgs[0].id as string);
      setChecking(false);
    })();
  }, [router]);

  const step: Step = STEPS[stepIndex];

  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function back() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function submit() {
    if (!orgId) return;
    setSaving(true);
    setError(null);

    // Versioned table: find the current max version for this org and write
    // the next one, rather than assuming this is the first submission -
    // running the interview again (an updated profile) must produce v2, v3...
    const { data: latest, error: latestErr } = await supabase
      .from("business_profile_versions")
      .select("version")
      .eq("org_id", orgId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestErr) {
      setError("שגיאה בבדיקת הגרסה הקודמת: " + latestErr.message);
      setSaving(false);
      return;
    }

    const nextVersion = (latest?.version ?? 0) + 1;

    const { error: insertErr } = await supabase.from("business_profile_versions").insert({
      org_id: orgId,
      version: nextVersion,
      pricing_notes: pricingNotes.trim() || null,
      team_size: teamSize.trim() ? parseInt(teamSize.trim(), 10) : null,
      tools_in_use: toList(toolsRaw),
      goals: toList(goalsRaw),
      pain_points: toList(painPointsRaw),
      source_agent: "discovery_agent",
      confirmed_by_user: true,
    });

    if (insertErr) {
      setError("שגיאה בשמירת הפרופיל: " + insertErr.message);
      setSaving(false);
      return;
    }

    router.replace("/dashboard");
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-dim)]">טוען...</p>
      </main>
    );
  }

  if (error && !orgId) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card max-w-md text-center">
          <p className="text-[var(--warn)]">{error}</p>
        </div>
      </main>
    );
  }

  const progressPct = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-lg">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-extrabold gradient-text">ראיון Discovery</h1>
            <span className="text-xs text-[var(--text-dim)]">
              שלב {stepIndex + 1} מתוך {STEPS.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--card-border)] overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, var(--accent-violet), var(--accent-teal))",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>

        {step === "pricing" && (
          <StepBlock
            title="איך נראה התמחור שלך?"
            help="לדוגמה: מחיר קבוע לשירות, לפי שעה, חבילות..."
          >
            <textarea
              className="input-field min-h-[100px]"
              value={pricingNotes}
              onChange={(e) => setPricingNotes(e.target.value)}
              placeholder="ספר לי בקצרה על מבנה התמחור אצלך"
            />
          </StepBlock>
        )}

        {step === "team_size" && (
          <StepBlock title="כמה אנשים בצוות שלך?" help="כולל אותך">
            <input
              type="number"
              min={1}
              className="input-field"
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              placeholder="לדוגמה: 4"
            />
          </StepBlock>
        )}

        {step === "tools" && (
          <StepBlock title="באילו כלים אתה משתמש היום?" help="הפרד בפסיקים או בשורות נפרדות">
            <textarea
              className="input-field min-h-[100px]"
              value={toolsRaw}
              onChange={(e) => setToolsRaw(e.target.value)}
              placeholder="לדוגמה: יומן גוגל, הנהלת חשבונות, וואטסאפ עסקי"
            />
          </StepBlock>
        )}

        {step === "goals" && (
          <StepBlock title="מה היעדים שלך לחצי שנה הקרובה?" help="הפרד בפסיקים או בשורות נפרדות">
            <textarea
              className="input-field min-h-[100px]"
              value={goalsRaw}
              onChange={(e) => setGoalsRaw(e.target.value)}
              placeholder="לדוגמה: צמיחה של 30% בהיקף העסק"
            />
          </StepBlock>
        )}

        {step === "pain_points" && (
          <StepBlock title="מה הכי מקשה עליך היום בעסק?" help="הפרד בפסיקים או בשורות נפרדות">
            <textarea
              className="input-field min-h-[100px]"
              value={painPointsRaw}
              onChange={(e) => setPainPointsRaw(e.target.value)}
              placeholder="לדוגמה: מציאת לקוחות חדשים"
            />
          </StepBlock>
        )}

        {step === "review" && (
          <div>
            <h2 className="font-bold mb-1">סיכום לפני שמירה</h2>
            <p className="text-xs text-[var(--text-dim)] mb-4">
              זה ייכתב כגרסה חדשה של הפרופיל העסקי שלך - הדשבורד יתעדכן בהתאם.
            </p>
            <ul className="text-sm space-y-2 text-[var(--text-dim)]">
              <li>
                <b className="text-[var(--text)]">תמחור:</b> {pricingNotes || "-"}
              </li>
              <li>
                <b className="text-[var(--text)]">גודל צוות:</b> {teamSize || "-"}
              </li>
              <li>
                <b className="text-[var(--text)]">כלים:</b> {toList(toolsRaw).join(", ") || "-"}
              </li>
              <li>
                <b className="text-[var(--text)]">יעדים:</b> {toList(goalsRaw).join(", ") || "-"}
              </li>
              <li>
                <b className="text-[var(--text)]">כאבים:</b>{" "}
                {toList(painPointsRaw).join(", ") || "-"}
              </li>
            </ul>
          </div>
        )}

        {error && orgId && <p className="text-sm text-[var(--warn)] mt-4">{error}</p>}

        <div className="flex items-center justify-between mt-6">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0 || saving}
            className="text-sm text-[var(--text-dim)] underline disabled:opacity-30"
          >
            חזרה
          </button>

          {step !== "review" ? (
            <button type="button" onClick={next} className="btn-primary">
              המשך
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="btn-primary disabled:opacity-50"
            >
              {saving ? "שומר..." : "שמור וסיים"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function StepBlock({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-bold mb-1">{title}</h2>
      {help && <p className="text-xs text-[var(--text-dim)] mb-3">{help}</p>}
      {children}
    </div>
  );
}

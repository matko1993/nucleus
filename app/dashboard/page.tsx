"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Org = { id: string; name: string; vertical: string };
type Profile = {
  pricing_notes: string | null;
  team_size: number | null;
  tools_in_use: string[] | null;
  goals: string[] | null;
  pain_points: string[] | null;
};
type Integration = { id: string; provider: string; status: string };
type Insight = { id: string; title: string; body: string; status: string; generated_by: string };
type Kpi = { id: string; metric_key: string; metric_value: number; period_start: string; period_end: string };
type Layout = { version: number; reason: string | null };

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [org, setOrg] = useState<Org | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadErrors, setLoadErrors] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        router.replace("/");
        return;
      }
      setUserEmail(sessionData.session.user.email ?? null);

      const { data: orgs, error: orgErr } = await supabase
        .from("organizations")
        .select("id,name,vertical")
        .limit(1);

      if (orgErr) {
        setError(orgErr.message);
        setLoading(false);
        return;
      }
      if (!orgs || orgs.length === 0) {
        setError("לא נמצא ארגון משויך למשתמש הזה.");
        setLoading(false);
        return;
      }
      const currentOrg = orgs[0] as Org;
      setOrg(currentOrg);

      const [profileRes, integrationsRes, insightsRes, kpiRes, layoutRes] = await Promise.all([
        supabase
          .from("business_profile_versions")
          .select("*")
          .eq("org_id", currentOrg.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("integrations").select("id,provider,status").eq("org_id", currentOrg.id),
        supabase
          .from("insights")
          .select("id,title,body,status,generated_by")
          .eq("org_id", currentOrg.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("kpi_snapshots")
          .select("id,metric_key,metric_value,period_start,period_end")
          .eq("org_id", currentOrg.id)
          .order("period_end", { ascending: false }),
        supabase
          .from("dashboard_layout_versions")
          .select("version,reason")
          .eq("org_id", currentOrg.id)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      // Every one of these queries can fail independently (wrong table name,
      // RLS denial, network issue) - surface that instead of silently
      // treating a query error the same as "no rows yet". That exact gap
      // (querying business_profile / dashboard_layout, which do not exist -
      // the real tables are business_profile_versions /
      // dashboard_layout_versions) is what made this screen look empty
      // while real data existed in Supabase.
      const queryErrors = [
        ["פרופיל עסק", profileRes.error],
        ["אינטגרציות", integrationsRes.error],
        ["תובנות", insightsRes.error],
        ["KPI", kpiRes.error],
        ["גרסת דשבורד", layoutRes.error],
      ].filter(([, err]) => err) as [string, { message: string }][];
      if (queryErrors.length > 0) {
        console.error("Dashboard query errors:", queryErrors);
        setLoadErrors(queryErrors.map(([label, err]) => `${label}: ${err.message}`));
      }

      if (profileRes.data) setProfile(profileRes.data as Profile);
      if (integrationsRes.data) setIntegrations(integrationsRes.data as Integration[]);
      if (insightsRes.data) setInsights(insightsRes.data as Insight[]);
      if (kpiRes.data) setKpis(kpiRes.data as Kpi[]);
      if (layoutRes.data) setLayout(layoutRes.data as Layout);

      setLoading(false);
    })();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-dim)]">טוען דשבורד...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="glass-card max-w-md text-center">
          <p className="text-[var(--warn)]">{error}</p>
          <button className="btn-primary mt-4" onClick={signOut}>
            חזרה להתחברות
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-10 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-extrabold gradient-text">Nucleus</h1>
          <p className="text-sm text-[var(--text-dim)]">
            {org?.name} · {userEmail}
          </p>
        </div>
        <button onClick={signOut} className="text-sm text-[var(--text-dim)] hover:text-[var(--text)] underline">
          התנתקות
        </button>
      </header>

      {loadErrors.length > 0 && (
        <div className="glass-card mb-6 border border-[var(--warn)] text-sm text-[var(--warn)]">
          <p className="font-semibold mb-1">חלק מהנתונים לא נטענו:</p>
          <ul className="list-disc pr-5 space-y-0.5">
            {loadErrors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        {kpis.length === 0 && (
          <div className="glass-card md:col-span-3 text-[var(--text-dim)] text-sm">
            עדיין אין KPI מחושב - יתעדכן אוטומטית אחרי הסנכרון הבא.
          </div>
        )}
        {kpis.map((k) => (
          <div key={k.id} className="glass-card">
            <p className="text-xs text-[var(--text-dim)] mb-1">{k.metric_key}</p>
            <p className="text-2xl font-bold">{k.metric_value}</p>
            <p className="text-xs text-[var(--text-dim)] mt-1">
              {k.period_start} → {k.period_end}
            </p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="glass-card">
          <h2 className="font-bold mb-3">פרופיל העסק</h2>
          {profile ? (
            <ul className="text-sm space-y-2 text-[var(--text-dim)]">
              <li>
                <b className="text-[var(--text)]">תמחור:</b> {profile.pricing_notes}
              </li>
              <li>
                <b className="text-[var(--text)]">גודל צוות:</b> {profile.team_size}
              </li>
              <li>
                <b className="text-[var(--text)]">כלים:</b> {(profile.tools_in_use || []).join(", ")}
              </li>
              <li>
                <b className="text-[var(--text)]">יעדים:</b> {(profile.goals || []).join(", ")}
              </li>
              <li>
                <b className="text-[var(--text)]">כאבים:</b> {(profile.pain_points || []).join(", ")}
              </li>
            </ul>
          ) : (
            <p className="text-sm text-[var(--text-dim)]">טרם הושלם ראיון Discovery.</p>
          )}
        </div>

        <div className="glass-card">
          <h2 className="font-bold mb-3">אינטגרציות</h2>
          {integrations.length === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">אין אינטגרציות מחוברות עדיין.</p>
          ) : (
            <ul className="space-y-2">
              {integrations.map((i) => (
                <li key={i.id} className="flex items-center justify-between text-sm">
                  <span>{i.provider}</span>
                  <span className={"badge " + (i.status === "connected" ? "badge-connected" : "badge-pending")}>
                    {i.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card md:col-span-2">
          <h2 className="font-bold mb-3">תובנות (Insights)</h2>
          {insights.length === 0 ? (
            <p className="text-sm text-[var(--text-dim)]">אין תובנות עדיין.</p>
          ) : (
            <ul className="space-y-4">
              {insights.map((ins) => (
                <li key={ins.id} className="border-t border-[var(--card-border)] pt-3 first:border-0 first:pt-0">
                  <p className="font-semibold text-sm">{ins.title}</p>
                  <p className="text-sm text-[var(--text-dim)] mt-1">{ins.body}</p>
                  <p className="text-xs text-[var(--text-dim)] mt-1">
                    מקור: {ins.generated_by} · סטטוס: {ins.status}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {layout && (
        <footer className="mt-8 text-xs text-[var(--text-dim)] text-center">
          גרסת דשבורד v{layout.version}
          {layout.reason ? " · " + layout.reason : ""}
        </footer>
      )}
    </main>
  );
}

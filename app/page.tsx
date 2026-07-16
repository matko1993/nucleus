"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Covers two cases with one check: an already-logged-in user opening the
    // site, and a user who just clicked the magic-link email — Supabase's
    // client (detectSessionInUrl: true) parses the token from the URL before
    // this resolves, so getSession() already returns the fresh session.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });

    // Belt-and-suspenders: react directly to the auth event too, in case it
    // fires slightly after the check above.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        router.replace("/dashboard");
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setMessage("שגיאה: " + error.message);
    } else {
      setSent(true);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-dim)]">טוען...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card w-full max-w-md">
        <h1 className="text-2xl font-extrabold mb-1">
          <span className="gradient-text">Nucleus</span>
        </h1>
        <p className="text-[var(--text-dim)] mb-6 text-sm">
          המערכת שלומדת את העסק שלך ובונה לך דשבורד אישי
        </p>

        {!sent ? (
          <form onSubmit={sendMagicLink} className="space-y-4">
            <input
              type="email"
              required
              placeholder="האימייל שלך"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "שולח קישור..." : "שלח לי קישור כניסה"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              שלחנו קישור כניסה ל-<strong>{email}</strong>.
            </p>
            <p className="text-sm text-[var(--text-dim)]">
              פתח את המייל ולחץ על הקישור - זה יעביר אותך ישר לדשבורד. הקישור בתוקף לשעה, ולשימוש חד-פעמי בלבד.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-sm text-[var(--text-dim)] underline"
            >
              שלח לאימייל אחר
            </button>
          </div>
        )}

        {message && <p className="text-sm text-[var(--warn)] mt-4">{message}</p>}
      </div>
    </main>
  );
}

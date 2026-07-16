"use client";
import { useEffect, useState, FormEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Supabase returns rate-limit / cooldown errors as raw English strings.
// Translate the patterns we actually see into clear Hebrew, and extract a
// cooldown duration so the UI can block the user from re-triggering the
// same error instead of just displaying it after the fact.
function translateAuthError(raw: string): { text: string; cooldown: number } {
  const waitMatch = raw.match(/after (\d+) seconds/i);
  if (waitMatch) {
    return {
      text: "כבר שלחנו לך מייל. אפשר לבקש קישור נוסף רק אחרי שהזמן הקצוב יחלוף.",
      cooldown: parseInt(waitMatch[1], 10),
    };
  }
  if (/rate limit/i.test(raw)) {
    return {
      text:
        "נשלחו יותר מדי בקשות בזמן קצר. כנראה שכבר קיבלת מייל - בדוק גם בתיקיית הספאם. אפשר לנסות שוב בעוד כמה דקות.",
      cooldown: 90,
    };
  }
  return { text: "שגיאה: " + raw, cooldown: 0 };
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // If Supabase redirected back here after a failed magic-link click
    // (expired / already used / invalid token), it appends error info to
    // the URL. Surface that clearly instead of silently showing a blank
    // login form, which is indistinguishable from "nothing happened".
    const hash = window.location.hash?.startsWith("#")
      ? window.location.hash.slice(1)
      : "";
    const hashParams = new URLSearchParams(hash);
    const queryParams = new URLSearchParams(window.location.search);
    const errorDescription =
      hashParams.get("error_description") || queryParams.get("error_description");
    if (errorDescription) {
      setMessage(
        "הקישור פג תוקף או שכבר נעשה בו שימוש. אפשר לבקש קישור חדש למטה - חשוב ללחוץ עליו פעם אחת בלבד."
      );
      window.history.replaceState(null, "", window.location.pathname);
    }

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

  useEffect(() => {
    if (cooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [cooldown]);

  async function sendMagicLink(e: FormEvent) {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      const { text, cooldown: cd } = translateAuthError(error.message);
      setMessage(text);
      if (cd) setCooldown(cd);
    } else {
      setSent(true);
      setMessage(null);
      // Block immediate resend so a real email has time to arrive before
      // the user can retrigger the exact rate-limit error we just fixed.
      setCooldown(45);
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
            <button
              type="submit"
              disabled={loading || cooldown > 0}
              className="btn-primary w-full disabled:opacity-50"
            >
              {loading
                ? "שולח קישור..."
                : cooldown > 0
                ? `אפשר לשלוח שוב בעוד ${cooldown} שניות`
                : "שלח לי קישור כניסה"}
            </button>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm">
              שלחנו קישור כניסה ל-<strong>{email}</strong>.
            </p>
            <p className="text-sm text-[var(--text-dim)]">
              פתח את המייל ולחץ על הקישור פעם אחת - זה יעביר אותך ישר לדשבורד.
              אם אינך רואה את המייל תוך דקה, בדוק בתיקיית הספאם. הקישור בתוקף
              לשעה ולשימוש חד-פעמי בלבד - לחיצה נוספת עליו לא תעבוד.
            </p>
            <button
              type="button"
              disabled={cooldown > 0}
              onClick={() => {
                setSent(false);
                setMessage(null);
              }}
              className="text-sm text-[var(--text-dim)] underline disabled:opacity-40"
            >
              {cooldown > 0 ? `אפשר לנסות שוב בעוד ${cooldown} שניות` : "שלח לאימייל אחר"}
            </button>
          </div>
        )}

        {message && <p className="text-sm text-[var(--warn)] mt-4">{message}</p>}
      </div>
    </main>
  );
}

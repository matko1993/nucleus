"use client";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/dashboard");
      } else {
        setChecking(false);
      }
    });
  }, [router]);

  async function sendCode(e: FormEvent) {
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
      setStep("code");
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "email",
    });
    setLoading(false);
    if (error) {
      setMessage("קוד שגוי או פג תוקף: " + error.message);
    } else {
      router.replace("/dashboard");
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

        {step === "email" ? (
          <form onSubmit={sendCode} className="space-y-4">
            <input
              type="email"
              required
              placeholder="האימייל שלך"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "שולח קוד..." : "קבל קוד כניסה"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-sm text-[var(--text-dim)]">
              שלחנו קוד בן 6 ספרות ל-{email}
            </p>
            <input
              type="text"
              required
              inputMode="numeric"
              placeholder="קוד בן 6 ספרות"
              className="input-field text-center tracking-[0.5em]"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "מאמת..." : "כניסה"}
            </button>
          </form>
        )}

        {message && <p className="text-sm text-[var(--warn)] mt-4">{message}</p>}
      </div>
    </main>
  );
}

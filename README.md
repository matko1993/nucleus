# Nucleus — MVP Dashboard (v0)

זהו MVP אמיתי ראשון - לא פרוטוטייפ סטטי - שמתחבר ל-Supabase האמיתי של הפרויקט (lzrhnceamjpkplkyajgi).

## התחברות לדמו
- אימייל: markp1293@gmail.com (המשתמש היחיד הקיים כרגע במערכת ה-Auth)
- ההתחברות מבוססת קישור (Magic Link) שנשלח למייל - לחיצה עליו מעבירה ישר לדשבורד. Site URL ו-Redirect URLs מוגדרים כראוי ב-Supabase ומצביעים על nucleus-dashboard-kappa.vercel.app (תוקן ב-16.7.2026 - קודם הצביעו בטעות על דומיין אחר לגמרי, client-dashboard-ai.vercel.app).

## מגבלות ידועות (V0, לא production)
- אין הרשמת משתמשים חדשים (shouldCreateUser: false) - רק Mark יכול להתחבר כרגע.
- ניהול Auth בצד לקוח (localStorage), לא SSR cookies - לשדרג בהמשך ל-@supabase/ssr לפני production.
- מציג את הארגון הראשון שנמצא למשתמש - לא תומך עדיין במשתמש עם כמה ארגונים.
- אין עדיין UI לראיון Discovery Agent או לחיבור אינטגרציות חדשות מתוך האפליקציה עצמה - זה כרגע תצוגה בלבד (read-only).
- מפתחות ה-OAuth של Nucleus עצמו (Google/QuickBooks/וכו') טרם נרשמו - האינטגרציה שהודגמה בצ'אט השתמשה במחבר של Claude/Cowork, לא בתשתית עצמאית של Nucleus.

## מה כן אמיתי
- מתחבר ל-Supabase האמיתי דרך RLS אמיתי - כל משתמש רואה רק את הארגון שהוא חבר בו.
- כל הנתונים המוצגים הם נתונים אמיתיים מהטבלאות שנבנו בשלבים הקודמים, לא מוקאפ.

// /api/index.js
// Backend Serverless Function (Vercel)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({
        error: "Missing Supabase environment variables!",
      });
    }

    const { action, user_id, amount, username } = req.body || {};

    // ---------- ⭐ 1) تسجيل مستخدم أول مرة ----------
    if (action === "register_user") {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id,
          username,
          points: 0,
          created_at: new Date().toISOString(),
        }),
      });

      const data = await r.json();
      return res.status(200).json({ ok: true, data });
    }

    // ---------- ⭐ 2) الحصول على بيانات مستخدم ----------
    if (action === "get_user") {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/users?user_id=eq.${user_id}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await r.json();
      return res.status(200).json({ ok: true, data });
    }

    // ---------- ⭐ 3) زيادة النقاط بعد مشاهدة إعلان ----------
    if (action === "add_points") {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/users?user_id=eq.${user_id}`,
        {
          method: "PATCH",
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ points: amount }),
        }
      );

      const data = await r.json();
      return res.status(200).json({ ok: true, data });
    }

    // ---------- ⭐ 4) طلب دفع ستارز (Telegram Invoice) ----------
    if (action === "create_invoice") {
      return res.status(200).json({
        ok: true,
        invoice: {
          title: "Stars Purchase",
          description: "Buying stars in game",
          amount,
        },
      });
    }

    return res.status(400).json({ error: "Unknown action!" });
  } catch (err) {
    return res.status(500).json({
      error: "Server Error",
      details: err.toString(),
    });
  }
}
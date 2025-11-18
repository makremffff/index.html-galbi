// FINAL BACKEND WITHOUT initData — FIXED 500 ERROR
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(500).json({ success: false, error: "Missing Supabase env vars" });
    }

    const action = req.query.action;
    const body = req.body || {};
    const user_id = body.user_id;

    if (!user_id) {
      return res.status(400).json({ success: false, error: "Missing user_id" });
    }

    // ---------------- Supabase helper ----------------
    async function sb(url, method = "GET", data = null) {
      return fetch(`${SUPABASE_URL}${url}`, {
        method,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : null,
      }).then((r) => r.json());
    }

    // ---------------- Create user if not exists ----------------
    async function ensureUser() {
      let u = await sb(`/rest/v1/users?user_id=eq.${user_id}`);

      if (!u || u.length === 0) {
        await sb(`/rest/v1/users`, "POST", {
          user_id,
          points: 0,
          tickets: 3,
          usdt: 0,
          invite_count: 0,
          created_at: new Date().toISOString(),
        });

        u = await sb(`/rest/v1/users?user_id=eq.${user_id}`);
      }

      return u[0];
    }

    // ===================================================================
    // =========================== ACTIONS ===============================
    // ===================================================================

    // ----- 1) getUserData -----
    if (action === "getUserData") {
      const u = await ensureUser();

      return res.json({
        success: true,
        points: u.points,
        usdt: u.usdt,
        tickets: u.tickets,
        user: {
          id: u.user_id,
          first_name: "Player",
          photo_url: "",
        },
      });
    }

    // ----- 2) updateStats -----
    if (action === "updateStats") {
      await ensureUser();

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: body.points,
        usdt: body.usdt,
        tickets: body.tickets,
      });

      return res.json({ success: true });
    }

    // ----- 3) startGame -----
    if (action === "startGame") {
      await ensureUser();
      return res.json({ success: true });
    }

    // ----- 4) endGame -----
    if (action === "endGame") {
      const u = await ensureUser();
      const earned = body.earned_points || 0;

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: u.points + earned,
      });

      return res.json({ success: true });
    }

    // ----- 5) watchAd -----
    if (action === "watchAd") {
      const u = await ensureUser();

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        tickets: u.tickets + 1,
      });

      return res.json({ success: true, tickets: 1 });
    }

    // ----- 6) purchaseTickets -----
    if (action === "purchaseTickets") {
      const u = await ensureUser();

      if (u.points < body.star_cost) {
        return res.json({ success: false, error: "Not enough stars" });
      }

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: u.points - body.star_cost,
        tickets: u.tickets + body.ticket_amount,
      });

      return res.json({ success: true });
    }

    // ----- 7) referral -----
    if (action === "referral") {
      const refID = body.referred_by;

      if (!refID || refID == user_id) {
        return res.json({ success: false });
      }

      const u = await ensureUser();

      if (u.referred_by) return res.json({ success: true });

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        referred_by: refID,
      });

      const ref = await sb(`/rest/v1/users?user_id=eq.${refID}`);
      if (ref.length > 0) {
        await sb(`/rest/v1/users?user_id=eq.${refID}`, "PATCH", {
          invite_count: ref[0].invite_count + 1,
          tickets: ref[0].tickets + 10,
        });
      }

      return res.json({ success: true });
    }

    // ----- 8) getInviteData -----
    if (action === "getInviteData") {
      const u = await ensureUser();
      const link = `https://t.me/Game_win_usdtBot/earn?startapp=ref_${user_id}`;

      return res.json({
        success: true,
        invite_count: u.invite_count,
        invite_link: link,
      });
    }

    // ----- 9) updateInviteCount -----
    if (action === "updateInviteCount") {
      const u = await ensureUser();

      return res.json({
        success: true,
        invite_count: u.invite_count,
      });
    }

    // ---------- Unknown ----------
    return res.json({ success: false, error: "Unknown action" });
  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Server Error",
      details: e.toString(),
    });
  }
}
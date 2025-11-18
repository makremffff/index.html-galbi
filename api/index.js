// /api/index.js — FULL BACKEND FOR TELEGRAM WEBAPP GAME (FINAL FIXED VERSION)
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

    // ========================== HELPER (Supabase) ==========================
    async function sb(url, method = "GET", data = null) {
      return await fetch(`${SUPABASE_URL}${url}`, {
        method,
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: data ? JSON.stringify(data) : null
      }).then(r => r.json());
    }

    // ========================== CREATE USER IF NOT EXISTS ==========================
    async function ensureUserCreated() {
      let u = await sb(`/rest/v1/users?user_id=eq.${user_id}`);

      if (!u || u.length === 0) {
        const tgUser = body.initData?.user || {};

        await sb(`/rest/v1/users`, "POST", {
          user_id,
          first_name: tgUser.first_name || "",
          last_name: tgUser.last_name || "",
          username: tgUser.username || "",
          photo_url: tgUser.photo_url || "",
          points: 0,
          tickets: 3,
          usdt: 0,
          invite_count: 0,
          referred_by: null,
          created_at: new Date().toISOString()
        });

        u = await sb(`/rest/v1/users?user_id=eq.${user_id}`);
      }

      return u[0];
    }

    // ======================================================================
    // =============================== ACTIONS ===============================
    // ======================================================================

    // ---------- 1) getUserData ----------
    if (action === "getUserData") {
      const u = await ensureUserCreated();

      return res.json({
        success: true,
        points: u.points,
        usdt: u.usdt,
        tickets: u.tickets,
        user: {
          id: u.user_id,
          first_name: u.first_name,
          photo_url: u.photo_url
        }
      });
    }

    // ---------- 2) updateStats ----------
    if (action === "updateStats") {
      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: body.points,
        usdt: body.usdt,
        tickets: body.tickets
      });

      return res.json({ success: true });
    }

    // ---------- 3) startGame ----------
    if (action === "startGame") {
      return res.json({ success: true });
    }

    // ---------- 4) endGame ----------
    if (action === "endGame") {
      const u = await ensureUserCreated();
      const newPoints = (u.points || 0) + (body.earned_points || 0);

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: newPoints
      });

      return res.json({ success: true });
    }

    // ---------- 5) watchAd ----------
    if (action === "watchAd") {
      const u = await ensureUserCreated();
      const newTickets = u.tickets + 1;

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        tickets: newTickets
      });

      return res.json({ success: true, tickets: 1 });
    }

    // ---------- 6) purchaseTickets ----------
    if (action === "purchaseTickets") {
      const u = await ensureUserCreated();

      if (u.points < body.star_cost)
        return res.json({ success: false, error: "Not enough stars" });

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: u.points - body.star_cost,
        tickets: u.tickets + body.ticket_amount
      });

      return res.json({ success: true });
    }

    // ---------- 7) referral ----------
    if (action === "referral") {
      const ref = body.referred_by;

      if (!ref || ref == user_id) return res.json({ success: false });

      const u = await ensureUserCreated();

      if (u.referred_by)
        return res.json({ success: true });

      // Save referral
      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        referred_by: ref
      });

      // Reward inviter
      const r = await sb(`/rest/v1/users?user_id=eq.${ref}`);
      if (r.length > 0) {
        await sb(`/rest/v1/users?user_id=eq.${ref}`, "PATCH", {
          invite_count: r[0].invite_count + 1,
          tickets: r[0].tickets + 10
        });
      }

      return res.json({ success: true });
    }

    // ---------- 8) getInviteData ----------
    if (action === "getInviteData") {
      const u = await ensureUserCreated();
      const link = `https://t.me/Game_win_usdtBot/earn?startapp=ref_${user_id}`;

      return res.json({
        success: true,
        invite_count: u.invite_count,
        invite_link: link
      });
    }

    // ---------- 9) updateInviteCount ----------
    if (action === "updateInviteCount") {
      const u = await ensureUserCreated();
      return res.json({
        success: true,
        invite_count: u.invite_count
      });
    }

    // ---------- UNKNOWN ----------
    return res.json({ success: false, error: "Unknown action" });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Server Error",
      details: e.toString()
    });
  }
}
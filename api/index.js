export default async function handler(req, res) {
  try {
    const action = req.query.action;
    const body = req.body || {};

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const sb = async (path, method = "GET", data = null) => {
      const r = await fetch(`${SUPABASE_URL}${path}`, {
        method,
        headers: {
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer": method === "POST" || method === "PATCH" ? "return=representation" : ""
        },
        body: data ? JSON.stringify(data) : undefined
      });
      return await r.json();
    };

    const user_id = body.user_id;
    if (!user_id) return res.json({ success: false, error: "missing user_id" });

    // Parse Telegram initData ----------------------------
    let tgUser = {};
    if (body.initData) {
      try {
        if (typeof body.initData === "string") {
          const params = new URLSearchParams(body.initData);
          if (params.has("user")) tgUser = JSON.parse(params.get("user"));
        } else tgUser = body.initData.user || {};
      } catch (e) { tgUser = {}; }
    }

    // Ensure user exists --------------------------------
    async function ensureUser() {
      let u = await sb(`/rest/v1/users?user_id=eq.${user_id}`);
      if (!u || u.length === 0) {
        await sb(`/rest/v1/users`, "POST", {
          user_id,
          points: 0,
          tickets: 3
        });
        u = await sb(`/rest/v1/users?user_id=eq.${user_id}`);
      }
      return u[0];
    }

    // ===================================================
    // ACTIONS
    // ===================================================

    // GET USER DATA
    if (action === "getUserData") {
      const u = await ensureUser();
      return res.json({
        success: true,
        points: u.points,
        usdt: u.usdt,
        tickets: u.tickets,
        highscore: u.game_highscore,
        invite_count: u.invite_count,
        user: {
          id: u.user_id,
          first_name: tgUser.first_name || "",
          last_name: tgUser.last_name || "",
          username: tgUser.username || "",
          photo_url: tgUser.photo_url || ""
        }
      });
    }

    // START GAME
    if (action === "startGame") {
      const u = await ensureUser();
      if (u.tickets <= 0) {
        return res.json({ success: false, error: "No tickets" });
      }

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        tickets: u.tickets - 1,
        total_games: u.total_games + 1
      });

      await sb(`/rest/v1/game_sessions`, "POST", {
        user_id,
        score: 0
      });

      return res.json({ success: true });
    }

    // END GAME
    if (action === "endGame") {
      const score = body.score || 0;
      const u = await ensureUser();

      let updateData = {
        points: u.points + score
      };

      if (score > u.game_highscore) {
        updateData.game_highscore = score;
      }

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", updateData);

      return res.json({
        success: true,
        new_points: updateData.points,
        new_highscore: updateData.game_highscore || u.game_highscore
      });
    }

    // WATCH AD
    if (action === "watchAd") {
      const u = await ensureUser();
      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        ads_watched: u.ads_watched + 1,
        tickets: u.tickets + 1
      });
      return res.json({ success: true, tickets: u.tickets + 1 });
    }

    // PURCHASE TICKETS
    if (action === "purchaseTickets") {
      const cost = body.star_cost;
      const add = body.ticket_amount;
      const u = await ensureUser();

      if (u.points < cost) {
        return res.json({ success: false, error: "Not enough points" });
      }

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: u.points - cost,
        tickets: u.tickets + add
      });

      return res.json({ success: true });
    }

    // REFERRAL
    if (action === "referral") {
      const refID = body.referred_by;
      if (!refID || refID == user_id) return res.json({ success: false });

      const u = await ensureUser();
      if (u.referred_by) return res.json({ success: true });

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        referred_by: refID
      });

      const inviting = await sb(`/rest/v1/users?user_id=eq.${refID}`);
      if (inviting && inviting.length > 0) {
        await sb(`/rest/v1/users?user_id=eq.${refID}`, "PATCH", {
          invite_count: inviting[0].invite_count + 1,
          tickets: inviting[0].tickets + 5
        });

        await sb(`/rest/v1/referrals`, "POST", {
          user_id: refID,
          invited_user: user_id
        });
      }
      return res.json({ success: true });
    }

    // GET INVITE DATA
    if (action === "getInviteData") {
      const u = await ensureUser();
      const link = `https://t.me/Game_win_usdtBot/earn?startapp=ref_${user_id}`;
      return res.json({
        success: true,
        invite_count: u.invite_count,
        invite_link: link
      });
    }

    return res.json({ success: false, error: "Invalid action" });

  } catch (e) {
    res.status(500).json({
      success: false,
      error: "Server Error",
      details: e.toString()
    });
  }
}
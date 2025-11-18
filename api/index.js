export default async function handler(req, res) {
  try {
    const action = req.query.action;
    const body = req.body || {};

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const BOT_TOKEN = process.env.BOT_TOKEN;

    const sb = async (path, method = "GET", data = null) => {
      const r = await fetch(`${SUPABASE_URL}${path}`, {
        method,
        headers: {
          "apikey": SUPABASE_KEY,
          "Content-Type": "application/json",
          "Prefer":
            method === "PATCH" || method === "POST"
              ? "return=representation"
              : "",
        },
        body: data ? JSON.stringify(data) : undefined,
      });
      return await r.json();
    };

    const user_id = body.user_id;
    if (!user_id)
      return res.json({ success: false, error: "missing user_id" });

    // Parse Telegram initData (photo, name)
    let tgUser = {};
    if (body.initData) {
      try {
        const params = new URLSearchParams(body.initData);
        if (params.has("user")) tgUser = JSON.parse(params.get("user"));
      } catch (e) {
        tgUser = {};
      }
    }

    // Ensure user exists
    async function ensureUser() {
      let u = await sb(`/rest/v1/users?user_id=eq.${user_id}`);
      if (!u || u.length === 0) {
        await sb(`/rest/v1/users`, "POST", {
          user_id,
          points: 0,
          tickets: 5,
          usdt: 0,
        });
        u = await sb(`/rest/v1/users?user_id=eq.${user_id}`);
      }
      return u[0];
    }

    // ===========================================================
    // 1) GET USER DATA (most important)
    // ===========================================================
    if (action === "getUserData") {
      const u = await ensureUser();

      return res.json({
        success: true,
        user: {
          id: u.user_id,
          first_name: tgUser.first_name || "",
          last_name: tgUser.last_name || "",
          username: tgUser.username || "",
          photo_url: tgUser.photo_url || "",
          points: u.points,
          tickets: u.tickets,
          usdt: u.usdt,
          highscore: u.game_highscore,
          inviteCount: u.invite_count,
        },
      });
    }

    // ===========================================================
    // 2) START GAME SESSION
    // ===========================================================
    if (action === "startGameSession") {
      const u = await ensureUser();
      if (u.tickets <= 0) {
        return res.json({ success: false, error: "NO_TICKETS" });
      }

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        tickets: u.tickets - 1,
        total_games: u.total_games + 1,
      });

      await sb(`/rest/v1/game_sessions`, "POST", {
        user_id,
      });

      return res.json({ success: true });
    }

    // ===========================================================
    // 3) END GAME SESSION
    // ===========================================================
    if (action === "endGameSession") {
      const score = Number(body.score || 0);
      const u = await ensureUser();

      let newPoints = u.points + score;
      let newHighscore = u.game_highscore;

      if (score > u.game_highscore) newHighscore = score;

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: newPoints,
        game_highscore: newHighscore,
      });

      return res.json({
        success: true,
        newPoints,
        newHighscore,
      });
    }

    // ===========================================================
    // 4) WATCH AD → give 1 ticket
    // ===========================================================
    if (action === "watchAd") {
      const u = await ensureUser();

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        tickets: u.tickets + 1,
        ads_watched: u.ads_watched + 1,
      });

      return res.json({
        success: true,
        tickets: u.tickets + 1,
      });
    }

    // ===========================================================
    // 5) BUY TICKETS USING POINTS
    // ===========================================================
    if (action === "processPayment") {
      const cost = Number(body.star_cost);
      const add = Number(body.ticket_amount);

      const u = await ensureUser();
      if (u.points < cost)
        return res.json({ success: false, error: "NO_POINTS" });

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: u.points - cost,
        tickets: u.tickets + add,
        purchases: u.purchases + 1,
      });

      return res.json({ success: true });
    }

    // ===========================================================
    // 6) UPDATE POINTS
    // ===========================================================
    if (action === "updatePoints") {
      const amount = Number(body.amount);

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        points: amount,
      });

      return res.json({ success: true });
    }

    // ===========================================================
    // 7) UPDATE TICKETS
    // ===========================================================
    if (action === "updateTickets") {
      const amount = Number(body.amount);

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        tickets: amount,
      });

      return res.json({ success: true });
    }

    // ===========================================================
    // 8) REFERRAL SYSTEM
    // ===========================================================
    if (action === "referral") {
      const refID = Number(body.referred_by);
      if (!refID || refID === user_id)
        return res.json({ success: false });

      const u = await ensureUser();
      if (u.referred_by) return res.json({ success: true });

      await sb(`/rest/v1/users?user_id=eq.${user_id}`, "PATCH", {
        referred_by: refID,
      });

      const inviter = await sb(`/rest/v1/users?user_id=eq.${refID}`);
      if (inviter && inviter.length > 0) {
        await sb(`/rest/v1/users?user_id=eq.${refID}`, "PATCH", {
          invite_count: inviter[0].invite_count + 1,
          tickets: inviter[0].tickets + 5,
        });

        await sb(`/rest/v1/referrals`, "POST", {
          user_id: refID,
          invited_user: user_id,
        });
      }

      return res.json({ success: true });
    }

    // ===========================================================
    // 9) GET INVITE DATA
    // ===========================================================
    if (action === "getInviteData") {
      const u = await ensureUser();

      const link = `https://t.me/Game_win_usdtBot/earn?startapp=ref_${user_id}`;

      return res.json({
        success: true,
        inviteCount: u.invite_count,
        inviteLink: link,
      });
    }

    // ===========================================================
    // 10) CREATE INVOICE (Telegram Stars)
    // ===========================================================
    if (action === "createInvoice") {
      if (!BOT_TOKEN)
        return res.json({ success: false, error: "Missing BOT_TOKEN" });

      const amount = Number(body.amount);
      const description = body.description || "Buy Tickets";

      const invoicePayload = {
        title: "Ticket Purchase",
        description,
        payload: "ticket_purchase_" + user_id,
        currency: "XTR",
        prices: [
          { label: "Tickets", amount: amount * 100000000 },
        ],
      };

      const tgRes = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(invoicePayload),
        }
      );

      const data = await tgRes.json();

      if (!data.ok) {
        return res.json({
          success: false,
          error: "Telegram API Error",
          details: data,
        });
      }

      return res.json({
        success: true,
        invoice_link: data.result,
      });
    }

    // ===========================================================
    return res.json({ success: false, error: "INVALID_ACTION" });

  } catch (e) {
    return res.status(500).json({
      success: false,
      error: "Server Error",
      details: e.toString(),
    });
  }
}
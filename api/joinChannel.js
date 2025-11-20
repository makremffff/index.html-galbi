import { db } from './_supabase.js';

export default async function handler(req, res) {
  const { userId, action, ticketLeft } = req.body;
  await db.insert('actions', { user_id: userId, action, ticket_left: ticketLeft, created_at: new Date().toISOString() });
  res.status(200).json({ ok: true });
}

import { db } from './_supabase.js';
export default async function handler(req,res){
  const { userId, emoji, totalScore } = req.body;
  await db.insert("collects",{ user_id:userId, emoji });
  await db.update("users",{ score: totalScore }, `telegram_id=eq.${userId}`);
  res.status(200).json({ ok:true });
}
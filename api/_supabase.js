export const SUPABASE_URL = process.env.SUPABASE_URL;
export const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE;

export const db = {
  async insert(table, record) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(record)
    });
    return res.json();
  },
  async select(table, query = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    return res.json();
  },
  async update(table, record, query = '') {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      },
      body: JSON.stringify(record)
    });
    return res.json();
  }
};

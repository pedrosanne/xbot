/**
 * Facebook Marketing API Integration Helper
 */

// Helper to check for API errors and throw descriptive messages
async function handleResponse(res) {
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error?.message || 'Erro desconhecido na API do Facebook';
    console.error('Facebook API Error:', data.error);
    throw new Error(errorMsg);
  }
  return data;
}

/**
 * Fetch all ad accounts associated with the access token
 */
export async function getAdAccounts(accessToken) {
  const url = `https://graph.facebook.com/v19.0/me/adaccounts?fields=id,name,account_status,currency&limit=150&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await handleResponse(res);
  return data.data || [];
}

/**
 * Fetch campaigns, adsets, or ads with their insights (spend) for a given date range
 * @param {string} accessToken - Facebook Access Token
 * @param {string} adAccountId - Ad Account ID (e.g. "act_123456")
 * @param {string} level - 'campaign' | 'adset' | 'ad'
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 */
export async function getFacebookAdsData({ accessToken, adAccountId, level = 'campaign', startDate, endDate }) {
  const timeRange = JSON.stringify({ since: startDate, until: endDate });
  let fields = '';
  let endpoint = '';

  if (level === 'campaign') {
    fields = `id,name,status,objective,daily_budget,lifetime_budget,insights.time_range(${timeRange}){spend,impressions,inline_link_clicks}`;
    endpoint = `https://graph.facebook.com/v19.0/${adAccountId}/campaigns`;
  } else if (level === 'adset') {
    fields = `id,name,status,daily_budget,lifetime_budget,campaign{id,name},insights.time_range(${timeRange}){spend,impressions,inline_link_clicks}`;
    endpoint = `https://graph.facebook.com/v19.0/${adAccountId}/adsets`;
  } else {
    // ad level
    fields = `id,name,status,campaign{id,name},adset{id,name},insights.time_range(${timeRange}){spend,impressions,inline_link_clicks}`;
    endpoint = `https://graph.facebook.com/v19.0/${adAccountId}/ads`;
  }

  const url = `${endpoint}?fields=${encodeURIComponent(fields)}&limit=150&access_token=${accessToken}`;
  const res = await fetch(url);
  const data = await handleResponse(res);
  return data.data || [];
}

/**
 * Update the status of a campaign, adset, or ad
 * @param {string} accessToken - Facebook Access Token
 * @param {string} id - Campaign/Adset/Ad ID
 * @param {string} status - 'ACTIVE' | 'PAUSED'
 */
export async function updateFbElementStatus(accessToken, id, status) {
  const url = `https://graph.facebook.com/v19.0/${id}?status=${status}&access_token=${accessToken}`;
  const res = await fetch(url, { method: 'POST' });
  return await handleResponse(res);
}

/**
 * Update the daily budget of a campaign or adset
 * @param {string} accessToken - Facebook Access Token
 * @param {string} id - Campaign or Adset ID
 * @param {string} budget - Budget in cents (Facebook API expects cents/integer for currency) or float depending on account currency.
 * Note: Facebook Ads API budget is represented in the account's smallest currency unit (e.g. cents for BRL/USD).
 * So R$ 100,00 is sent as 10000.
 */
export async function updateFbElementBudget(accessToken, id, budgetAmount) {
  // Convert budget to cents (integer)
  const budgetInCents = Math.round(budgetAmount * 100);
  const url = `https://graph.facebook.com/v19.0/${id}?daily_budget=${budgetInCents}&access_token=${accessToken}`;
  const res = await fetch(url, { method: 'POST' });
  return await handleResponse(res);
}

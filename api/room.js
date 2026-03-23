const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_SUBDOMAIN = 'aruncs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const roomName = 'cs-eval-' + email.toLowerCase().replace(/[@.]/g, '-');
  const roomUrl  = `https://${DAILY_SUBDOMAIN}.daily.co/${roomName}`;

  try {
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          enable_prejoin_ui: false,          // skip the pre-join screen
          exp: Math.floor(Date.now() / 1000) + 7200, // expires in 2 hours
          max_participants: 5,
        },
      }),
    });

    // 409 = room already exists from a previous attempt — still usable
    if (response.ok || response.status === 409) {
      return res.status(200).json({ url: roomUrl });
    }

    const err = await response.json();
    console.error('Daily.co error:', err);
    return res.status(500).json({ error: 'Failed to create room' });
  } catch (err) {
    console.error('room error:', err.message);
    return res.status(500).json({ error: 'Failed to create room' });
  }
}

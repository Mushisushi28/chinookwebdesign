export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    const event = payload?.event;

    // Only handle invitee.created events
    if (event !== 'invitee.created') {
      return res.status(200).json({ ok: true, skipped: true });
    }

    const invitee = payload?.payload?.invitee || {};
    const scheduledEvent = payload?.payload?.scheduled_event || {};
    const questions = payload?.payload?.questions_and_answers || [];

    const name = invitee.name || 'Unknown';
    const email = invitee.email || 'Unknown';
    const startTime = scheduledEvent.start_time
      ? new Date(scheduledEvent.start_time).toLocaleString('en-CA', {
          timeZone: 'America/Edmonton',
          month: 'short', day: 'numeric', year: 'numeric',
          hour: 'numeric', minute: '2-digit', hour12: true
        })
      : 'Unknown time';

    // Look for phone number in Q&A
    let phone = null;
    for (const qa of questions) {
      const q = (qa.question || '').toLowerCase();
      if (q.includes('phone') || q.includes('mobile') || q.includes('number') || q.includes('cell')) {
        if (qa.answer && qa.answer.trim()) {
          phone = qa.answer.trim();
          break;
        }
      }
    }

    const message = `📅 Calendly booking: ${name} — ${startTime} — Phone: ${phone || 'not provided'} — Email: ${email}`;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = '7949309437';

    const tgPayload = JSON.stringify({
      chat_id: chatId,
      text: message,
    });

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: tgPayload,
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('Telegram error:', JSON.stringify(tgData));
      return res.status(500).json({ error: 'Telegram send failed', details: tgData });
    }

    console.log('Calendly webhook processed:', name, email, startTime);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}

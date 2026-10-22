// Приймає заявку/анкету з сайту й пересилає тренеру в Telegram.
// Токен і chat_id беруться з змінних оточення Netlify, у код сторінки вони не потрапляють.
const res = (s, b) => ({ statusCode: s, headers: { "Content-Type": "application/json" }, body: JSON.stringify(b) });

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return res(405, { ok: false });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) return res(500, { ok: false });

  let d;
  try { d = JSON.parse(event.body || "{}"); } catch { return res(400, { ok: false }); }

  const title = d.type === "questionnaire" ? "Анкета клієнта" : "Нова заявка";
  const text = String(d.text || "").slice(0, 3500);
  if (text.length < 10) return res(400, { ok: false });
  const photos = Array.isArray(d.photos) ? d.photos.slice(0, 3) : [];
  const api = (m) => `https://api.telegram.org/bot${token}/${m}`;

  const r = await fetch(api("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: `${title}\n\n${text}` }),
  });
  if (!r.ok) return res(502, { ok: false });

  for (let i = 0; i < photos.length; i++) {
    const b64 = String(photos[i]);
    if (b64.length > 2000000) continue;
    const fd = new FormData();
    fd.append("chat_id", chat);
    fd.append("caption", `Фото «до» ${i + 1}`);
    fd.append("photo", new Blob([Buffer.from(b64, "base64")], { type: "image/jpeg" }), `before${i + 1}.jpg`);
    await fetch(api("sendPhoto"), { method: "POST", body: fd });
  }
  return res(200, { ok: true });
};

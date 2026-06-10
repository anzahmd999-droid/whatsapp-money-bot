require("dotenv").config();
const express = require("express");
const axios = require("axios");
const fs = require("fs");

const app = express();
app.use(express.json());

// ─── Config ───────────────────────────────────────────────────────────────────
const VERIFY_TOKEN   = process.env.VERIFY_TOKEN;    // any random string you set
const ACCESS_TOKEN   = process.env.ACCESS_TOKEN;    // from Meta dashboard
const PHONE_ID       = process.env.PHONE_ID;        // Phone Number ID from Meta
const MY_NUMBER      = process.env.MY_NUMBER;       // your personal number e.g. 919538349926
const FRIEND_NUMBER  = process.env.FRIEND_NUMBER;   // friend's number e.g. 91XXXXXXXXXX
const CURRENCY       = process.env.CURRENCY || "₹";
const DATA_FILE      = "./balance.json";

// ─── Balance Storage ──────────────────────────────────────────────────────────
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { balance: 0, transactions: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function fmt(n) {
  return CURRENCY + Math.abs(n).toLocaleString("en-IN");
}

function formatDate() {
  return new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

// ─── Send WhatsApp Message ─────────────────────────────────────────────────────
async function sendMessage(to, text) {
  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${PHONE_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: text }
      },
      {
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (err) {
    console.error("Send error:", err.response?.data || err.message);
  }
}

// ─── Parse Commands ────────────────────────────────────────────────────────────
// Supported formats:
//   sent 500
//   sent 500 dinner
//   received 300
//   received 300 rent
//   balance
//   history
//   help
function parseCommand(text) {
  const clean = text.trim().toLowerCase();

  if (clean === "balance" || clean === "bal") return { cmd: "balance" };
  if (clean === "history" || clean === "hist") return { cmd: "history" };
  if (clean === "help") return { cmd: "help" };

  const sentMatch = clean.match(/^sent\s+(\d+(?:\.\d+)?)(?:\s+(.+))?$/);
  if (sentMatch) return { cmd: "sent", amount: parseFloat(sentMatch[1]), note: sentMatch[2] || "" };

  const recvMatch = clean.match(/^received\s+(\d+(?:\.\d+)?)(?:\s+(.+))?$/) ||
                    clean.match(/^recv\s+(\d+(?:\.\d+)?)(?:\s+(.+))?$/);
  if (recvMatch) return { cmd: "received", amount: parseFloat(recvMatch[1]), note: recvMatch[2] || "" };

  return { cmd: "unknown" };
}

// ─── Handle Incoming Message ───────────────────────────────────────────────────
async function handleMessage(from, text) {
  const isMe     = from === MY_NUMBER;
  const isFriend = from === FRIEND_NUMBER;

  if (!isMe && !isFriend) {
    await sendMessage(from, "⛔ Sorry, this is a private bot.");
    return;
  }

  const parsed = parseCommand(text);
  const data   = loadData();

  if (parsed.cmd === "help") {
    await sendMessage(from, [
      "💰 *Money Tracker Bot*",
      "",
      "Commands:",
      "  *sent 500* — record you sent money",
      "  *sent 500 dinner* — with a note",
      "  *received 300* — record money received",
      "  *received 300 rent* — with a note",
      "  *balance* — check current balance",
      "  *history* — last 5 transactions",
      "  *help* — show this message"
    ].join("\n"));
    return;
  }

  if (parsed.cmd === "balance") {
    const bal = data.balance;
    let msg = "";
    if (bal > 0) msg = `💰 *Current Balance*\n\nYou are holding *${fmt(bal)}* for your friend.\n\n📅 ${formatDate()}`;
    else if (bal < 0) msg = `💰 *Current Balance*\n\nYour friend owes you *${fmt(-bal)}*.\n\n📅 ${formatDate()}`;
    else msg = `💰 *Current Balance*\n\nAll settled up! ✅\n\n📅 ${formatDate()}`;
    await sendMessage(from, msg);
    return;
  }

  if (parsed.cmd === "history") {
    const last = data.transactions.slice(-5).reverse();
    if (last.length === 0) {
      await sendMessage(from, "📭 No transactions yet.");
      return;
    }
    const lines = last.map(t =>
      `${t.type === "sent" ? "📤" : "📥"} ${t.type === "sent" ? "-" : "+"}${fmt(t.amount)}${t.note ? " (" + t.note + ")" : ""}\n   ${t.date}`
    );
    await sendMessage(from, `📋 *Last ${last.length} Transactions*\n\n` + lines.join("\n\n"));
    return;
  }

  if (parsed.cmd === "sent" || parsed.cmd === "received") {
    const amt = parsed.amount;
    const note = parsed.note;
    const isSent = parsed.cmd === "sent";

    // Update balance
    // "sent" = you sent money to friend = balance decreases (less to hold)
    // "received" = friend sent you money = balance increases (more to hold)
    if (isSent) {
      data.balance -= amt;
    } else {
      data.balance += amt;
    }

    // Record transaction
    data.transactions.push({
      type: parsed.cmd,
      amount: amt,
      note,
      date: formatDate(),
      by: isMe ? "you" : "friend"
    });

    saveData(data);

    const bal = data.balance;
    const action = isSent
      ? `✅ *${fmt(amt)} sent*${note ? " for " + note : ""}`
      : `✅ *${fmt(amt)} received*${note ? " (" + note + ")" : ""}`;

    const balLine =
      bal > 0 ? `💰 Remaining balance with you: *${fmt(bal)}*`
      : bal < 0 ? `💰 Your friend now owes you: *${fmt(-bal)}*`
      : `💰 All settled up! 🎉`;

    const reply = `${action}\n\n${balLine}\n\n📅 ${formatDate()}`;

    // Send to both parties so both stay updated
    await sendMessage(MY_NUMBER, reply);
    if (FRIEND_NUMBER && FRIEND_NUMBER !== MY_NUMBER) {
      await sendMessage(FRIEND_NUMBER, reply);
    }
    return;
  }

  // Unknown command
  await sendMessage(from, `❓ Unknown command. Send *help* to see all commands.`);
}

// ─── Webhook Verification ──────────────────────────────────────────────────────
app.get("/webhook", (req, res) => {
  const mode      = req.query["hub.mode"];
  const token     = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ─── Webhook Receiver ──────────────────────────────────────────────────────────
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Always respond quickly to Meta

  try {
    const entry   = req.body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value   = changes?.value;
    const message = value?.messages?.[0];

    if (!message || message.type !== "text") return;

    const from = message.from;           // sender's number
    const text = message.text?.body || "";

    console.log(`📩 From ${from}: ${text}`);
    await handleMessage(from, text);
  } catch (err) {
    console.error("Webhook error:", err.message);
  }
});

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send("💰 Money Tracker Bot is running!"));

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Bot running on port ${PORT}`));

const nodemailer = require("nodemailer");
const settings = require("../config/settings");
const fs = require("node:fs/promises");
const path = require("node:path");
const storage = require("../config/storage");

let transport;

function isMailConfigured() {
  return Boolean(settings.mail.host && settings.mail.from);
}

function getTransport() {
  if (!transport) {
    transport = nodemailer.createTransport({
      host: settings.mail.host, port: settings.mail.port, secure: settings.mail.secure,
      requireTLS: settings.isProduction && !settings.mail.secure,
      ...(settings.mail.username ? { auth: { user: settings.mail.username, pass: settings.mail.password } } : {}),
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      disableFileAccess: true, disableUrlAccess: true
    });
  }
  return transport;
}

async function sendNotification(message) {
  const envelope = {
    from: settings.mail.from || "ShopNow <no-reply@shopnow.local>", to: message.recipient, subject: message.subject,
    text: message.text_body, html: message.html_body, messageId: `<${message.id}@shopnow.local>`,
    disableFileAccess: true, disableUrlAccess: true
  };
  if (settings.notificationMailMode === "preview") {
    const local = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: "windows", disableFileAccess: true, disableUrlAccess: true });
    const result = await local.sendMail(envelope);
    const filename = message.id + ".eml";
    if (!storage.previewFilename.test(filename)) throw new Error("Invalid preview identifier.");
    await fs.mkdir(storage.mailPreviews, { recursive: true, mode: 0o700 });
    await fs.writeFile(path.join(storage.mailPreviews, filename), result.message, { mode: 0o600 });
    return { status: "previewed", preview_file: filename };
  }
  if (!isMailConfigured()) throw new Error("Email service is not configured.");
  await getTransport().sendMail(envelope);
  return { status: "sent", preview_file: null };
}

async function sendResetEmail(email, token) {
  if (!isMailConfigured()) throw new Error("Email service is not configured.");
  const baseUrl = new URL(settings.appUrl);
  if (!["http:", "https:"].includes(baseUrl.protocol) || baseUrl.username || baseUrl.password) throw new Error("APP_URL must be an HTTP or HTTPS site URL.");
  const resetUrl = new URL("/reset-password", baseUrl);
  resetUrl.searchParams.set("token", token);
  await getTransport().sendMail({
    from: settings.mail.from, to: email, subject: "Reset your ShopNow password",
    text: "A password reset was requested for your ShopNow account.\n\n"
      + resetUrl.toString() + "\n\nThis link expires in 15 minutes and can be used once.\n"
      + "If you did not request this, you can ignore this email."
  });
}

function closeTransport() {
  if (transport) { transport.close(); transport = null; }
}

module.exports = { isMailConfigured, sendResetEmail, sendNotification, closeTransport };

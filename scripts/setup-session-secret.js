const fs = require("node:fs");
const path = require("node:path");
const { randomBytes } = require("node:crypto");
const dotenv = require("dotenv");

const file = path.resolve(__dirname, "../.env");
if (!fs.existsSync(file)) {
  console.error("Create .env from .env.example and enter your database settings first.");
  process.exitCode = 1;
} else {
  const source = fs.readFileSync(file, "utf8");
  const current = dotenv.parse(source).SESSION_SECRET || "";
  if (Buffer.byteLength(current, "utf8") >= 32 && !current.includes("replace_with")) {
    console.log("SESSION_SECRET is already configured. Your existing settings were kept.");
  } else {
    const secret = randomBytes(32).toString("hex");
    const newline = source.includes("\r\n") ? "\r\n" : "\n";
    const line = /^(?:export[ \t]+)?SESSION_SECRET[ \t]*=[^\r\n]*/gm;
    const updated = line.test(source)
      ? source.replace(line, "SESSION_SECRET=" + secret)
      : source + (source.endsWith("\n") ? "" : newline) + "SESSION_SECRET=" + secret + newline;
    fs.writeFileSync(file, updated, "utf8");
    console.log("SESSION_SECRET configured. Database settings were kept; the secret is not printed.");
  }
}

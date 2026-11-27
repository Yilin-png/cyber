/* Fail when tracked minute files no longer match the public placeholder. */
const fs = require("fs");
const path = require("path");

const files = [
  "server/content/gatherings/001.html",
  "server/content/gatherings/001.en.html",
  "server/content/gatherings/002.html",
  "server/content/gatherings/002.en.html",
  "worker/content-001.html",
  "worker/content-002.html"
];
const marker = "本期纪要尚未配置";

let failed = false;
for (const file of files) {
  const full = path.join(__dirname, "..", file);
  const text = fs.readFileSync(full, "utf8");
  if (!text.includes(marker) || text.length > 400) {
    console.error(`private-content check failed: ${file}`);
    failed = true;
  }
}

if (failed) {
  console.error("Tracked minute files must stay placeholders. Do not commit restored minutes.");
  process.exit(1);
}

console.log(`private content check ok (${files.length} placeholders)`);

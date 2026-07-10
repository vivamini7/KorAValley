const fs = require("fs");
const path = require("path");

const d = new Date();
const pad = (n) => String(n).padStart(2, "0");
const lastUpdated = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

const outPath = path.join(__dirname, "../src/data/buildInfo.json");
fs.writeFileSync(outPath, JSON.stringify({ lastUpdated }, null, 2));

console.log(`[buildInfo] lastUpdated = ${lastUpdated}`);

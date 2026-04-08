import puppeteer from "puppeteer";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const htmlPath = join(__dirname, "setup-template.html");
const outputPath = join(__dirname, "SETUP.pdf");

const html = readFileSync(htmlPath, "utf-8");

console.log("Launching browser…");
const browser = await puppeteer.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = await browser.newPage();

console.log("Loading HTML…");
await page.setContent(html, {
  waitUntil: "networkidle0",
  timeout: 30000,
});

// Wait for Google Fonts to load
await new Promise((r) => setTimeout(r, 2000));

console.log("Generating PDF…");
await page.pdf({
  path: outputPath,
  format: "A4",
  printBackground: true,
  margin: { top: "0", right: "0", bottom: "0", left: "0" },
  preferCSSPageSize: false,
});

await browser.close();
console.log(`PDF saved to: ${outputPath}`);

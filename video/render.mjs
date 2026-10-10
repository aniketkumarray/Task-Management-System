// Render scene.html to video.
//   node render.mjs preview 1.5,14,25        -> work/preview/t_*.png
//   node render.mjs sheet                    -> work/preview/sheet.png (one frame per ~3 s)
//   node render.mjs render [workers]         -> task-tracker-demo.mp4
import { chromium } from "playwright";
import { spawn, execSync } from "node:child_process";
import { readFileSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = fileURLToPath(new URL("./", import.meta.url));
const WORK = HERE + "work\\";
const tl = JSON.parse(readFileSync(WORK + "timeline.json", "utf8"));
const FPS = tl.fps, TOTAL = Math.ceil(tl.duration * FPS);
const FFMPEG = process.env.FFMPEG ?? execSync('python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
const [mode = "sheet", arg] = process.argv.slice(2);

const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--hide-scrollbars", "--force-color-profile=srgb"] });

async function scenePage() {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on("console", (m) => { if (m.type() !== "log") console.log("[page]", m.type(), m.text()); });
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  await page.goto(pathToFileURL(HERE + "scene.html").href);
  const info = await page.evaluate((tl) => window.init(tl), tl);
  return { page, info };
}
// PNG encoding of these gradient-heavy frames costs 0.3–0.9 s each; JPEG q95 is ~70 ms and the
// final H.264 4:2:0 encode hides the difference.
const shot = (page, t, type = "jpeg") => page.evaluate((t) => window.frame(t), t).then(() => page.screenshot({ type, quality: type === "jpeg" ? 95 : undefined, clip: { x: 0, y: 0, width: 1920, height: 1080 } }));

if (mode === "preview" || mode === "sheet") {
  mkdirSync(WORK + "preview", { recursive: true });
  const { page } = await scenePage();
  const times = mode === "preview" ? arg.split(",").map(Number) : Array.from({ length: Math.ceil(tl.duration / 3) }, (_, i) => i * 3 + 1.5);
  const files = [];
  for (const t of times) {
    const f = `${WORK}preview\\t_${t.toFixed(2).replace(".", "_")}.png`;
    writeFileSync(f, await shot(page, t, "png")); files.push(f);
  }
  if (mode === "sheet") {
    // contact sheet via Pillow
    const py = `
from PIL import Image, ImageDraw
files = ${JSON.stringify(files)}
times = ${JSON.stringify(times)}
cols = 5; w, h = 384, 216
rows = -(-len(files) // cols)
sheet = Image.new("RGB", (cols * w, rows * (h + 22)), (10, 10, 14)); d = ImageDraw.Draw(sheet)
for i, (f, t) in enumerate(zip(files, times)):
    im = Image.open(f).resize((w, h)); x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im, (x, y + 22)); d.text((x + 6, y + 5), f"t={t:.1f}s", fill=(230, 230, 230))
sheet.save(r"${WORK}preview\\sheet.png")
`;
    writeFileSync(WORK + "sheet.py", py); execSync(`python "${WORK}sheet.py"`);
    console.log("sheet:", WORK + "preview\\sheet.png");
  } else console.log(files.join("\n"));
  await browser.close();
  process.exit(0);
}

if (mode === "render") {
  const workers = Number(arg ?? 4);
  const per = Math.ceil(TOTAL / workers);
  const t0 = Date.now();
  let done = 0;
  const jobs = Array.from({ length: workers }, async (_, k) => {
    const from = k * per, to = Math.min(TOTAL, (k + 1) * per);
    if (from >= to) return null;
    const { page } = await scenePage();
    const seg = `${WORK}seg_${k}.mp4`;
    const ff = spawn(FFMPEG, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
      "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", "-r", String(FPS), "-g", "60", seg], { stdio: ["pipe", "inherit", "inherit"] });
    for (let i = from; i < to; i++) {
      const buf = await shot(page, i / FPS);
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      if (++done % 150 === 0) console.log(`${done}/${TOTAL} frames  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end();
    await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg seg " + k + " exit " + c)))));
    await page.close();
    return seg;
  });
  const segs = (await Promise.all(jobs)).filter(Boolean);
  await browser.close();
  console.log(`frames done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  writeFileSync(WORK + "concat.txt", segs.map((s) => `file '${s.replace(/\\/g, "/")}'`).join("\n"));
  execSync(`"${FFMPEG}" -y -loglevel error -f concat -safe 0 -i "${WORK}concat.txt" -c copy "${WORK}video.mp4"`);

  // two-pass loudnorm on the mix to -14 LUFS / -1.5 dBTP
  const measure = execSync(`"${FFMPEG}" -hide_banner -i "${WORK}mix.wav" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1`).toString();
  const m = JSON.parse(measure.slice(measure.lastIndexOf("{"), measure.lastIndexOf("}") + 1));
  const ln = `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true:print_format=summary`;
  const out = HERE + "task-tracker-demo.mp4";
  execSync(`"${FFMPEG}" -y -loglevel error -i "${WORK}video.mp4" -i "${WORK}mix.wav" -af "${ln}" -c:v copy -c:a aac -b:a 256k -ar 48000 -movflags +faststart -shortest "${out}"`);
  for (const s of segs) rmSync(s, { force: true });
  console.log("output:", out);
  process.exit(0);
}

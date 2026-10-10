// Removes everything seed-demo.mjs created (tasks cascade their updates/deadline changes).
import { readFileSync, unlinkSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const ids = JSON.parse(readFileSync(new URL("./demo-ids.json", import.meta.url), "utf8"));

const del = async (path) => {
  const r = await fetch(`${URL_}${path}`, { method: "DELETE", headers: H });
  return r.status;
};

for (const id of Object.values(ids.tasks)) await del(`/rest/v1/tasks?id=eq.${id}`);
for (const id of Object.values(ids.users)) {
  await del(`/rest/v1/profiles?id=eq.${id}`);
  await del(`/auth/v1/admin/users/${id}`);
}

const left = await Promise.all([
  fetch(`${URL_}/rest/v1/profiles?select=email`, { headers: H }).then((r) => r.json()),
  fetch(`${URL_}/rest/v1/tasks?select=id`, { headers: H }).then((r) => r.json()),
]);
console.log("Remaining profiles:", left[0].map((p) => p.email));
console.log("Remaining tasks:", left[1].length);
unlinkSync(new URL("./demo-ids.json", import.meta.url));

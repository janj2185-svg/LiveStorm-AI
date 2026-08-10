import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const auth = read("src/auth.ts");
assert.match(auth, /Google\(/);
assert.match(auth, /GitHub\(/);
assert.match(auth, /PostgresAdapter/);
assert.match(auth, /strategy:\s*"database"/);
assert.match(auth, /httpOnly:\s*true/);
assert.match(auth, /secure:\s*useSecureCookies/);

const login = read("src/app/login/page.tsx");
assert.match(login, /Увійти з Google|LoginButtons/);
assert.match(login, /callbackUrl/);

const appPage = read("src/app/app/page.tsx");
assert.match(appPage, /LogoutButton/);
assert.match(appPage, /redirect\("\/login/);

const appLayout = read("src/app/app/layout.tsx");
assert.match(appLayout, /redirect\("\/login\?callbackUrl=\/app"\)/);

const schema = fs.readFileSync(
  path.resolve(root, "../../infrastructure/postgres/auth-schema.sql"),
  "utf8"
);
for (const table of ["users", "accounts", "sessions", "verification_token"]) {
  assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
}

console.log("OK unit auth checks passed");

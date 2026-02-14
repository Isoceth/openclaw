import fs from "node:fs";
import path from "node:path";

// `tsc` emits the entry d.ts at `dist/plugin-sdk/plugin-sdk/index.d.ts` because
// the source lives at `src/plugin-sdk/index.ts` and `rootDir` is `src/`.
// Keep a stable `dist/plugin-sdk/index.d.ts` alongside `index.js` for TS users.
const dir = path.join(process.cwd(), "dist/plugin-sdk");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "index.d.ts"), 'export * from "./plugin-sdk/index";\n', "utf8");
fs.writeFileSync(
  path.join(dir, "account-id.d.ts"),
  'export * from "./plugin-sdk/account-id";\n',
  "utf8",
);

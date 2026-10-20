// Packages ./extension into public/ so the install page can offer it as a download.
// Runs automatically before `dev` and `build`, so the zip never goes stale.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync } from "fflate";

const dir = "extension";
const folder = "mba-recruiting-tool-extension"; // unzipping gives a single, clearly named folder
const files = {};
for (const name of readdirSync(dir)) {
  files[`${folder}/${name}`] = new Uint8Array(readFileSync(join(dir, name)));
}
writeFileSync(`public/${folder}.zip`, zipSync(files, { level: 9 }));
console.log(`Packaged ${Object.keys(files).length} extension files -> public/${folder}.zip`);

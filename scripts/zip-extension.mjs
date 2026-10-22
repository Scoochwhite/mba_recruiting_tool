// Packages ./extension into public/ so the install page can offer it as a download.
// Runs automatically before `dev` and `build`, so the zip never goes stale.
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zipSync } from "fflate";

const dir = "extension";
const folder = "mba-recruiting-tool-extension"; // unzipping gives a single, clearly named folder
const files = {};

// Includes subfolders (e.g. fonts/).
function add(path) {
  for (const name of readdirSync(path)) {
    const full = join(path, name);
    if (statSync(full).isDirectory()) add(full);
    else files[`${folder}/${full.slice(dir.length + 1)}`] = new Uint8Array(readFileSync(full));
  }
}
add(dir);

writeFileSync(`public/${folder}.zip`, zipSync(files, { level: 9 }));
console.log(`Packaged ${Object.keys(files).length} extension files -> public/${folder}.zip`);

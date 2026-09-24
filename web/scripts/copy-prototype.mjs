// Serves the team's prototype as the frontend: copies ../prototype/index.html to public/prototype.html.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";

const src = new URL("../../prototype/index.html", import.meta.url);
const dest = new URL("../public/prototype.html", import.meta.url);

if (existsSync(src)) {
  mkdirSync(new URL("../public/", import.meta.url), { recursive: true });
  copyFileSync(src, dest);
  console.log("prototype copied to public/prototype.html");
} else {
  console.warn("prototype/index.html not found; / will 404");
}

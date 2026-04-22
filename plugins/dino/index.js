import { readFile } from "fs/promises";
import { join } from "path";

let _pluginDir = null;

export default {
  name: "Dino",
  trigger: "dino",
  description: "Play the Chrome dino game.",

  init(ctx) {
    _pluginDir = ctx.dir;
  },

  execute() {
    return {
      title: "Dino",
      html: `<iframe
        src="/api/plugin/dino/game"
        style="width:100%;height:500px;border:none;display:block;border-radius:4px;"
        title="Dino"
      ></iframe>`,
    };
  },
};

export const routes = [
  {
    method: "get",
    path: "/game",
    async handler(_req) {
      try {
        const html = await readFile(join(_pluginDir, "game.html"), "utf-8");
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      } catch {
        return new Response("Game not found", { status: 404 });
      }
    },
  },
];

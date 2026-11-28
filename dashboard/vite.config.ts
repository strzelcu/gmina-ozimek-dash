import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import { readLocalities, localityDirectory, readPszok, pszokConfigPath } from "./scripts/localities.mjs";
import { dashboardBasePath } from "./scripts/dashboard-path.mjs";
import { wasteCalendar } from "./scripts/waste-calendar.mjs";

const root = fileURLToPath(new URL(".", import.meta.url));
const localitiesModule = "virtual:ozimek-localities";

export default defineConfig(({ command }) => {
  const calendarFiles = new Map<string, string>();
  return {
    root,
    base: dashboardBasePath,
    plugins: [
      react(),
      {
        name: "ozimek-localities",
        resolveId(id) {
          if (id === localitiesModule) return `\0${id}`;
        },
        load(id) {
          if (id !== `\0${localitiesModule}`) return;
          calendarFiles.clear();
          this.addWatchFile(pszokConfigPath);
          const localities = readLocalities();
          const points = readPszok();
          for (const locality of localities) {
            this.addWatchFile(join(localityDirectory, `${locality.slug}.yaml`));
            const point = points.get(locality.municipality);
            if (point) locality.waste.pszok = point;
            locality.waste.schedules = locality.waste.schedules.map(schedule => {
              const { fileName, source } = wasteCalendar(locality, schedule);
              if (command === "build") this.emitFile({ type: "asset", fileName, source });
              else calendarFiles.set(dashboardBasePath + fileName, source);
              return { ...schedule, calendarFile: fileName };
            });
          }
          return `export default ${JSON.stringify(localities)};`;
        },
        configureServer(server) {
          server.middlewares.use((request, response, next) => {
            const pathname = request.url?.split("?")[0] ?? "";
            const calendar = calendarFiles.get(pathname);
            if (!calendar) return next();
            response.setHeader("Content-Type", "text/calendar; charset=utf-8");
            response.end(calendar);
          });
        },
      },
    ],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    css: { postcss: { plugins: [tailwindcss()] } },
  };
});

import { mkdir, readdir, writeFile } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const MAX_PNG_BYTES = 10 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const labels = new Set(["circle", "square", "triangle"]);
const imagesDirectory = fileURLToPath(new URL("../../../docs/images/", import.meta.url));
const imagesDirectoryUrl = new URL("../../../docs/images/", import.meta.url);

function nextFilename(entries: readonly string[], label: string): string {
  const expression = new RegExp(`^${label}-(\\d+)\\.png$`);
  const largest = entries.reduce((maximum, entry) => {
    const match = expression.exec(entry);
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 0);
  return `${label}-${largest + 1}.png`;
}

function sendJson(response: ServerResponse, status: number, value: object): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(value));
}

async function readPng(request: IncomingMessage): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += bytes.length;
    if (length > MAX_PNG_BYTES) throw new Error("O PNG excede o limite de 10 MB.");
    chunks.push(bytes);
  }
  const png = Buffer.concat(chunks);
  if (png.length < PNG_SIGNATURE.length || !png.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) throw new Error("O conteúdo enviado não é um PNG válido.");
  return png;
}

async function savePng(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Use POST para exportar o PNG." });
    return;
  }
  const label = request.headers["x-airdraw-label"];
  if (typeof label !== "string" || !labels.has(label)) {
    sendJson(response, 400, { error: "O rótulo do desenho é inválido." });
    return;
  }
  try {
    const png = await readPng(request);
    await mkdir(imagesDirectory, { recursive: true });
    const entries = await readdir(imagesDirectory);
    let filename = nextFilename(entries, label);
    for (let attempts = 0; attempts < 100; attempts += 1) {
      try {
        await writeFile(new URL(filename, imagesDirectoryUrl), png, { flag: "wx" });
        sendJson(response, 201, { filename });
        return;
      } catch (error) {
        if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
        const current = Number(/-(\d+)\.png$/.exec(filename)?.[1] ?? 0);
        filename = `${label}-${current + 1}.png`;
      }
    }
    throw new Error("Não foi possível reservar um nome de arquivo para o PNG.");
  } catch (error) {
    sendJson(response, 400, { error: error instanceof Error ? error.message : "Não foi possível salvar o PNG." });
  }
}

/** Development-only bridge: browsers cannot write directly to the repository. */
export function pngExportPlugin(): Plugin {
  return {
    name: "airdraw-local-png-export",
    configureServer(server) {
      server.middlewares.use("/api/export-whiteboard-png", (request, response) => {
        void savePng(request, response);
      });
    },
  };
}

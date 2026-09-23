import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Team } from "./team";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const ttl = 28 * 24 * 60 * 60;
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const storageMode = url && token ? "redis" : "temporary";
const directory = join(tmpdir(), "lich-da-bong-doi");
function key(slug: string) {
  if (!/^[a-f0-9]{12}$/.test(slug))
    throw new ApiError(404, "Không tìm thấy đội. Kiểm tra lại đường dẫn nhé.");
  return `football:${slug}`;
}
async function redis(command: (string | number)[]) {
  const response = await fetch(url!, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("Redis request failed");
  const data = await response.json();
  if (data.error) throw new Error("Redis command failed");
  return data.result;
}
async function rawRead(slug: string): Promise<string | null> {
  const id = key(slug);
  if (Boolean(url) !== Boolean(token))
    throw new Error("Incomplete Redis configuration");
  if (storageMode === "redis") return redis(["GET", id]);
  try {
    return await readFile(join(directory, `${slug}.json`), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
function decode(raw: string | null): Team {
  if (!raw)
    throw new ApiError(
      404,
      "Đội không tồn tại hoặc dữ liệu đã hết hạn. Hãy tạo đội mới.",
    );
  const team: Team = JSON.parse(raw);
  if (team.expiresAt <= Date.now())
    throw new ApiError(
      404,
      "Lịch của đội đã hết hạn sau 28 ngày. Hãy tạo đội mới.",
    );
  return team;
}
export async function getTeam(slug: string) {
  return decode(await rawRead(slug));
}
async function fileWrite(team: Team) {
  await mkdir(directory, { recursive: true });
  const target = join(directory, `${team.slug}.json`);
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(team), "utf8");
  await rename(temp, target);
}
export async function createTeam(name: string) {
  const team: Team = {
    slug: randomUUID().replaceAll("-", "").slice(0, 12),
    name,
    expiresAt: Date.now() + ttl * 1000,
    members: [],
  };
  if (Boolean(url) !== Boolean(token))
    throw new Error("Incomplete Redis configuration");
  if (storageMode === "redis") {
    const result = await redis([
      "SET",
      key(team.slug),
      JSON.stringify(team),
      "EX",
      ttl,
      "NX",
    ]);
    if (!result) return createTeam(name);
  } else await fileWrite(team);
  return team;
}
const globalStore = globalThis as typeof globalThis & {
  footballQueue?: Promise<unknown>;
};
export async function updateTeam(
  slug: string,
  edit: (team: Team) => void,
): Promise<Team> {
  key(slug);
  if (storageMode === "redis") {
    for (let attempt = 0; attempt < 12; attempt++) {
      const previous = await rawRead(slug);
      const team = decode(previous);
      edit(team);
      const result = await redis([
        "EVAL",
        "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'KEEPTTL'); return 1 else return 0 end",
        1,
        key(slug),
        previous!,
        JSON.stringify(team),
      ]);
      if (result === 1) return team;
    }
    throw new ApiError(
      409,
      "Đội đang có nhiều người cập nhật. Vui lòng thử lại.",
    );
  }
  const operation = (globalStore.footballQueue || Promise.resolve())
    .catch(() => {})
    .then(async () => {
      const team = await getTeam(slug);
      edit(team);
      await fileWrite(team);
      return team;
    });
  globalStore.footballQueue = operation;
  return operation;
}

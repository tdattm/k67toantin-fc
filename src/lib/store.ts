import { createHash, randomUUID } from "node:crypto";
import { mkdir, readdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Team, TeamSummary } from "./team";
import { hashTeamPin } from "./team-security";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const ttl = 365 * 24 * 60 * 60;
const legacyTtl = 28 * 24 * 60 * 60;
const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
export const storageMode = url && token ? "redis" : "temporary";
const directory = join(tmpdir(), "lich-da-bong-doi");
function key(slug: string) {
  if (!/^(?:[a-f0-9]{12}|u-[a-f0-9]{12})$/.test(slug))
    throw new ApiError(404, "Không tìm thấy đội. Kiểm tra lại đường dẫn nhé.");
  return `football:${slug}`;
}
export async function redis(command: (string | number)[]) {
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
  if (storageMode !== "redis" && process.env.NODE_ENV === "production")
    throw new ApiError(503, "Production cần cấu hình Redis bền vững.");
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
  if (team.kind !== "account") {
    delete team.captainMemberId;
    delete team.captainTokenHash;
    delete team.captainUid;
  }
  if (!team.createdAt) {
    team.createdAt = team.expiresAt - legacyTtl * 1000;
    team.expiresAt = team.createdAt + ttl * 1000;
  }
  if (team.expiresAt <= Date.now())
    throw new ApiError(
      404,
      "Dữ liệu của đội đã hết hạn sau một năm. Hãy tạo đội mới.",
    );
  return team;
}
function needsLegacyUpgrade(raw: string) {
  const previous: Team = JSON.parse(raw);
  return !previous.createdAt || (previous.kind !== "account" &&
    (previous.captainMemberId !== undefined || previous.captainTokenHash !== undefined || previous.captainUid !== undefined));
}
export async function getTeam(slug: string) {
  const raw = await rawRead(slug);
  const team = decode(raw);
  if (raw && needsLegacyUpgrade(raw)) await persistLegacyTeam(slug, raw, team);
  return team;
}
export async function listTeams(): Promise<TeamSummary[]> {
  if (storageMode !== "redis" && process.env.NODE_ENV === "production")
    throw new ApiError(503, "Production cần cấu hình Redis bền vững.");
  if (Boolean(url) !== Boolean(token))
    throw new Error("Incomplete Redis configuration");
  const teams: TeamSummary[] = [];
  async function collect(slug: string, raw: string | null) {
    try {
      const team = decode(raw);
      if (raw && needsLegacyUpgrade(raw))
        await persistLegacyTeam(slug, raw, team);
      teams.push({
        slug: team.slug,
        name: team.name,
        expiresAt: team.expiresAt,
        memberCount: team.members.length,
        requiresPin: Boolean(team.accessPinHash),
      });
    } catch (error) {
      // A team may expire or disappear while the list is being read.
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
  }
  if (storageMode === "redis") {
    let cursor = "0";
    const seen = new Set<string>();
    do {
      const [nextCursor, keys] = (await redis([
        "SCAN", cursor, "MATCH", "football:*", "COUNT", 100,
      ])) as [string, string[]];
      cursor = String(nextCursor);
      const teamKeys = keys.filter((id) => {
        if (!/^football:[a-f0-9]{12}$/.test(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      if (teamKeys.length) {
        const records = (await redis(["MGET", ...teamKeys])) as (string | null)[];
        for (let i = 0; i < records.length; i++)
          await collect(teamKeys[i].slice("football:".length), records[i]);
      }
    } while (cursor !== "0");
  } else {
    let files: string[];
    try {
      files = await readdir(directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
    for (const file of files) {
      if (/^[a-f0-9]{12}\.json$/.test(file))
        await collect(file.slice(0, -5), await rawRead(file.slice(0, -5)));
    }
  }
  // Every team has the same fixed TTL, so expiry order is creation order.
  return teams.sort((a, b) => b.expiresAt - a.expiresAt || a.slug.localeCompare(b.slug));
}
const deletePinWindowSeconds = 15 * 60;
const deletePinMaxAttempts = 10;
const deletionAttempts = new Map<string, { count: number; expiresAt: number }>();

function deletionAttemptKey(clientId: string) {
  return `football:delete-pin-attempt:${createHash("sha256").update(clientId).digest("hex")}`;
}

export async function checkDeletePinRateLimit(clientId: string) {
  if (storageMode === "redis") {
    const attempts = await redis([
      "EVAL",
      "local attempts = redis.call('INCR', KEYS[1]); if attempts == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end; return attempts",
      1,
      deletionAttemptKey(clientId),
      deletePinWindowSeconds,
    ]);
    return Number(attempts) <= deletePinMaxAttempts;
  }

  const now = Date.now();
  let entry = deletionAttempts.get(clientId);
  if (!entry || entry.expiresAt <= now) {
    entry = { count: 0, expiresAt: now + deletePinWindowSeconds * 1000 };
    deletionAttempts.set(clientId, entry);
  }
  entry.count++;
  return entry.count <= deletePinMaxAttempts;
}

export async function clearDeletePinRateLimit(clientId: string) {
  if (storageMode === "redis") {
    await redis(["DEL", deletionAttemptKey(clientId)]);
    return;
  }
  deletionAttempts.delete(clientId);
}

export async function deleteTeams(slugs: string[]) {
  if (!slugs.length)
    throw new ApiError(400, "Chọn ít nhất một đội để xóa.");
  const uniqueSlugs = [...new Set(slugs)];
  const ids = uniqueSlugs.map(key);
  for (const slug of uniqueSlugs) {
    const team = await getTeam(slug);
    if (team.kind === "account") throw new ApiError(403, "PIN quản trị legacy không thể xóa đội tài khoản.");
  }
  if (Boolean(url) !== Boolean(token))
    throw new Error("Incomplete Redis configuration");

  if (storageMode === "redis") {
    const deletedCount = await redis([
      "EVAL",
      "for i=1,#KEYS do local raw=redis.call('GET',KEYS[i]); if raw and cjson.decode(raw).kind == 'account' then return redis.error_reply('ACCOUNT_TEAM') end end; return redis.call('DEL', unpack(KEYS))",
      ids.length,
      ...ids,
    ]);
    return { deletedCount: Number(deletedCount) };
  }

  let deletedCount = 0;
  for (const slug of uniqueSlugs) {
    try {
      await unlink(join(directory, `${slug}.json`));
      deletedCount++;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return { deletedCount };
}
async function fileWrite(team: Team) {
  await mkdir(directory, { recursive: true });
  const target = join(directory, `${team.slug}.json`);
  const temp = `${target}.${randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(team), "utf8");
  await rename(temp, target);
}
async function persistLegacyTeam(slug: string, previous: string, team: Team) {
  if (storageMode === "redis") {
    const remainingSeconds = Math.ceil((team.expiresAt - Date.now()) / 1000);
    if (remainingSeconds <= 0) return;
    await redis([
      "EVAL",
      "if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[3]); return 1 else return 0 end",
      1,
      key(slug),
      previous,
      JSON.stringify(team),
      remainingSeconds,
    ]);
  } else {
    await fileWrite(team);
  }
}

export async function createTeam(name: string, firstMemberName: string, pin?: string) {
  if (storageMode !== "redis" && process.env.NODE_ENV === "production")
    throw new ApiError(503, "Production cần cấu hình Redis bền vững.");
  const createdAt = Date.now();
  const firstMemberId = randomUUID();
  const team: Team = {
    slug: randomUUID().replaceAll("-", "").slice(0, 12),
    kind: "legacy",
    name,
    createdAt,
    expiresAt: createdAt + ttl * 1000,
    ...(pin ? { accessPinHash: hashTeamPin(pin) } : {}),
    members: [{ id: firstMemberId, name: firstMemberName, slots: [], updatedAt: null }],
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
    if (!result) return createTeam(name, firstMemberName, pin);
  } else await fileWrite(team);
  return { team };
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
      if (team.kind === "account") throw new ApiError(403, "Đội tài khoản cần xác thực Firebase.");
      if (previous && needsLegacyUpgrade(previous)) {
        await persistLegacyTeam(slug, previous, team);
        continue;
      }
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
      if (team.kind === "account") throw new ApiError(403, "Đội tài khoản cần xác thực Firebase.");
      edit(team);
      await fileWrite(team);
      return team;
    });
  globalStore.footballQueue = operation;
  return operation;
}

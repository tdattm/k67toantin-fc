import { randomUUID } from "node:crypto";
import { ApiError, redis, storageMode, getTeam } from "./store";
import { hashTeamPin, verifyTeamPin } from "./team-security";
import type { Team, TeamSummary } from "./team";

const year = 365 * 24 * 60 * 60;
const key = (slug: string) => `football:${slug}`;
const memberIndex = (uid: string) => `football:uid:${uid}:member`;
const creatorIndex = (uid: string) => `football:uid:${uid}:created`;
const script = `
local previous=redis.call('GET',KEYS[1])
if previous~=ARGV[1] then return 0 end
if ARGV[2]=='' then redis.call('DEL',KEYS[1]) else redis.call('SET',KEYS[1],ARGV[2],'KEEPTTL') end
local before=cjson.decode(ARGV[1]); local after=nil
if ARGV[2]~='' then after=cjson.decode(ARGV[2]) end
local old={}; for _,m in ipairs(before.members) do if m.uid then old[m.uid]=true end end
local new={}; if after then for _,m in ipairs(after.members) do if m.uid then new[m.uid]=true end end end
for uid,_ in pairs(old) do if not new[uid] then redis.call('SREM','football:uid:'..uid..':member',before.slug) end end
for uid,_ in pairs(new) do if not old[uid] then redis.call('SADD','football:uid:'..uid..':member',before.slug) end end
if not after then redis.call('SREM','football:uid:'..before.creatorUid..':created',before.slug) end
return 1`;

export function requireRedis() {
  if (storageMode !== "redis") throw new ApiError(503, "Đội tài khoản cần cấu hình Redis bền vững.");
}

export function validJersey(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 99)
    throw new ApiError(400, "Số áo phải là số nguyên từ 0 đến 99.");
  return value;
}

export async function createAccountTeam(name: string, uid: string, displayName: string, jersey: number, pin?: string) {
  requireRedis();
  for (let attempt = 0; attempt < 5; attempt++) {
    const now = Date.now();
    const slug = `u-${randomUUID().replaceAll("-", "").slice(0, 12)}`;
    const team: Team = {
      kind: "account", slug, name, createdAt: now, expiresAt: now + year * 1000,
      creatorUid: uid, captainUid: uid, captainMemberId: uid,
      ...(pin ? { joinPinHash: hashTeamPin(pin) } : {}),
      members: [{ id: uid, uid, name: displayName, jerseyNumber: jersey, slots: [], updatedAt: null }],
    };
    const result = await redis(["EVAL", `
      if redis.call('EXISTS',KEYS[1])==1 then return 0 end
      redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2])
      redis.call('SADD',KEYS[2],ARGV[3]); redis.call('SADD',KEYS[3],ARGV[3]); return 1`,
      3, key(slug), memberIndex(uid), creatorIndex(uid), JSON.stringify(team), year, slug]);
    if (result === 1) return team;
  }
  throw new ApiError(503, "Chưa thể tạo mã đội. Vui lòng thử lại.");
}

export async function updateAccountTeam(slug: string, edit: (team: Team) => void): Promise<Team> {
  requireRedis();
  for (let attempt = 0; attempt < 16; attempt++) {
    const previous = await redis(["GET", key(slug)]) as string | null;
    if (!previous) throw new ApiError(404, "Đội không tồn tại hoặc đã hết hạn.");
    const team = JSON.parse(previous) as Team;
    if (team.kind !== "account") throw new ApiError(403, "Đây là đội legacy.");
    if (team.expiresAt <= Date.now()) throw new ApiError(404, "Đội đã hết hạn.");
    edit(team);
    const result = await redis(["EVAL", script, 1, key(slug), previous, JSON.stringify(team)]);
    if (result === 1) return team;
  }
  throw new ApiError(409, "Đội đang được cập nhật. Vui lòng thử lại.");
}

export async function deleteAccountTeam(slug: string, uid: string) {
  requireRedis();
  for (let attempt = 0; attempt < 16; attempt++) {
    const previous = await redis(["GET", key(slug)]) as string | null;
    if (!previous) throw new ApiError(404, "Đội không tồn tại.");
    const team = JSON.parse(previous) as Team;
    if (team.kind !== "account" || team.captainUid !== uid) throw new ApiError(403, "Chỉ đội trưởng hiện tại được xóa đội.");
    const result = await redis(["EVAL", script, 1, key(slug), previous, ""]);
    if (result === 1) return;
  }
  throw new ApiError(409, "Đội đang được cập nhật. Vui lòng thử lại.");
}

export async function listAccountTeams(uid: string): Promise<{ teams: TeamSummary[]; created: TeamSummary[] }> {
  requireRedis();
  const [memberSlugs, createdSlugs] = await Promise.all([
    redis(["SMEMBERS", memberIndex(uid)]) as Promise<string[]>,
    redis(["SMEMBERS", creatorIndex(uid)]) as Promise<string[]>,
  ]);
  const all = [...new Set([...memberSlugs, ...createdSlugs])];
  const summaries = new Map<string, TeamSummary>();
  const actualMember = new Set<string>();
  const actualCreator = new Set<string>();
  for (const slug of all) {
    let team: Team | null = null;
    try { team = await getTeam(slug); } catch (error) {
      if (!(error instanceof ApiError && error.status === 404)) throw error;
    }
    if (!team || team.kind !== "account") {
      await Promise.all([redis(["SREM", memberIndex(uid), slug]), redis(["SREM", creatorIndex(uid), slug])]);
      continue;
    }
    if (team.members.some(m => m.uid === uid)) actualMember.add(slug);
    else await redis(["SREM", memberIndex(uid), slug]);
    if (team.creatorUid === uid) actualCreator.add(slug);
    else await redis(["SREM", creatorIndex(uid), slug]);
    if (!actualMember.has(slug) && !actualCreator.has(slug)) continue;
    summaries.set(slug, { slug, name: team.name, expiresAt: team.expiresAt, memberCount: team.members.length, requiresPin: Boolean(team.joinPinHash) });
  }
  const sort = (slugs: string[]) => slugs.flatMap(slug => summaries.has(slug) ? [summaries.get(slug)!] : []).sort((a,b) => b.expiresAt-a.expiresAt);
  return { teams: sort([...actualMember]), created: sort([...actualCreator]) };
}

export async function checkJoinPin(slug: string, uid: string, pin: unknown, hash: string | undefined) {
  if (!hash) return;
  requireRedis();
  const limiter = `football:join-attempt:${slug}:${uid}`;
  const count = Number(await redis(["EVAL", "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],900) end; return n", 1, limiter]));
  if (count > 10) throw new ApiError(429, "Thử mã quá nhiều lần. Hãy đợi 15 phút.");
  if (typeof pin !== "string" || !verifyTeamPin(pin, hash)) throw new ApiError(403, "Mã tham gia không đúng.");
  await redis(["DEL", limiter]);
}

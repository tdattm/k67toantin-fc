import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";

type Entry = { value: string; expiresAt?: number };
const strings = new Map<string, Entry>();
const sets = new Map<string, Set<string>>();
const users = new Map<string, { name: string; verified: boolean }>([
  ["alice", { name: "Nguyễn Văn A", verified: true }],
  ["bob", { name: "Trần Văn B", verified: true }],
  ["carol", { name: "Lê Văn C", verified: true }],
  ["pending", { name: "Chưa Xác Minh", verified: false }],
]);
function read(key: string) { const entry = strings.get(key); if (entry?.expiresAt && entry.expiresAt <= Date.now()) { strings.delete(key); return null; } return entry?.value ?? null; }
function add(key: string, slug: string) { const set = sets.get(key) || new Set<string>(); set.add(slug); sets.set(key, set); }
function remove(key: string, slug: string) { sets.get(key)?.delete(slug); }
function accountIndex(uid: string) { return `football:uid:${uid}:member`; }
function creatorIndex(uid: string) { return `football:uid:${uid}:created`; }

const redisServer = createServer(async (request, response) => {
  let input = ""; for await (const chunk of request) input += chunk;
  const command = JSON.parse(input) as (string | number)[];
  const [op, ...args] = command;
  let result: unknown = null;
  const name = String(op).toUpperCase();
  if (name === "GET") result = read(String(args[0]));
  else if (name === "SET") {
    const [key, value] = args.map(String);
    if (!args.includes("NX") || !read(key)) { strings.set(key, { value, expiresAt: args.includes("EX") ? Date.now() + Number(args[args.indexOf("EX")+1])*1000 : undefined }); result = "OK"; }
  } else if (name === "SMEMBERS") result = [...(sets.get(String(args[0])) || [])];
  else if (name === "SREM") { remove(String(args[0]), String(args[1])); result = 1; }
  else if (name === "DEL") { strings.delete(String(args[0])); result = 1; }
  else if (name === "EVAL") {
    const script = String(args[0]); const keyCount = Number(args[1]);
    const keys = args.slice(2, 2+keyCount).map(String);
    const argv = args.slice(2+keyCount).map(String);
    if (script.includes("EXISTS") && script.includes("SADD")) {
      if (read(keys[0])) result = 0;
      else { strings.set(keys[0], { value: argv[0], expiresAt: Date.now()+Number(argv[1])*1000 }); add(keys[1], argv[2]); add(keys[2], argv[2]); result = 1; }
    } else if (script.includes("local previous=redis.call('GET'")) {
      if (read(keys[0]) !== argv[0]) result = 0;
      else {
        const before = JSON.parse(argv[0]); const after = argv[1] ? JSON.parse(argv[1]) : null;
        const old = new Set<string>(before.members.map((m: { uid: string }) => m.uid));
        const now = new Set<string>(after?.members.map((m: { uid: string }) => m.uid) || []);
        for (const uid of old) if (!now.has(uid)) remove(accountIndex(uid), before.slug);
        for (const uid of now) if (!old.has(uid)) add(accountIndex(uid), before.slug);
        if (after) strings.set(keys[0], { value: argv[1], expiresAt: strings.get(keys[0])?.expiresAt });
        else { strings.delete(keys[0]); remove(creatorIndex(before.creatorUid), before.slug); }
        result = 1;
      }
    } else if (script.includes("local n=redis.call('INCR'")) {
      const n = Number(read(keys[0]) || 0)+1; strings.set(keys[0], { value: String(n), expiresAt: strings.get(keys[0])?.expiresAt || Date.now()+900000 }); result = n;
    } else if (script.includes("'EX', ARGV[3]")) {
      if (read(keys[0]) !== argv[0]) result = 0;
      else { strings.set(keys[0], { value: argv[1], expiresAt: Date.now()+Number(argv[2])*1000 }); result = 1; }
    } else if (script.includes("KEEPTTL")) {
      if (read(keys[0]) !== argv[0]) result = 0;
      else { strings.set(keys[0], { value: argv[1], expiresAt: strings.get(keys[0])?.expiresAt }); result = 1; }
    } else if (script.includes("ACCOUNT_TEAM")) {
      if (keys.some(key => { const raw=read(key); return raw && JSON.parse(raw).kind === "account"; })) { response.writeHead(200, { "Content-Type": "application/json" }); response.end(JSON.stringify({ error: "ACCOUNT_TEAM" })); return; }
      for (const key of keys) strings.delete(key); result = keys.length;
    } else if (script.includes("INCR")) { const n=Number(read(keys[0])||0)+1; strings.set(keys[0], { value: String(n), expiresAt: Date.now()+900000 }); result=n; }
    else throw new Error(`Unsupported fixture script ${script.slice(0,50)}`);
  } else throw new Error(`Unsupported fixture command ${name}`);
  response.writeHead(200, { "Content-Type": "application/json" }); response.end(JSON.stringify({ result }));
});
const firebaseServer = createServer(async (request, response) => {
  let input=""; for await (const chunk of request) input+=chunk;
  const data = input ? JSON.parse(input) : {};
  const uid = data.localId?.[0]; const user = users.get(uid);
  response.writeHead(user ? 200 : 404, { "Content-Type": "application/json" });
  response.end(user ? JSON.stringify({ users: [{ localId: uid, email: `${uid}@example.invalid`, emailVerified: user.verified, displayName: user.name, validSince: "0" }] }) : JSON.stringify({ error: { message: "USER_NOT_FOUND" } }));
});
function token(uid: string) {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now()/1000);
  return `${encode({alg:"none",typ:"JWT"})}.${encode({aud:"fixture-project",iss:"https://securetoken.google.com/fixture-project",sub:uid,iat:now,exp:now+3600,auth_time:now,firebase:{sign_in_provider:"password"}})}.`;
}
const auth = (uid: string) => ({ Authorization: `Bearer ${token(uid)}` });
const context = (slug: string) => ({ params: Promise.resolve({ slug }) });

async function main() {
await new Promise<void>(resolve => redisServer.listen(0, "127.0.0.1", resolve));
await new Promise<void>(resolve => firebaseServer.listen(0, "127.0.0.1", resolve));
process.env.UPSTASH_REDIS_REST_URL = `http://127.0.0.1:${(redisServer.address() as {port:number}).port}`;
process.env.UPSTASH_REDIS_REST_TOKEN = "fixture-only";
process.env.FIREBASE_PROJECT_ID = "fixture-project";
process.env.FIREBASE_AUTH_EMULATOR_HOST = `127.0.0.1:${(firebaseServer.address() as {port:number}).port}`;

const { GET: list, POST: create } = await import("../src/app/api/teams/route");
const { GET: get, PATCH: patch, DELETE: deleteTeam } = await import("../src/app/api/teams/[slug]/route");
const { POST: join } = await import("../src/app/api/teams/[slug]/join/route");
const { DELETE: deleteLegacy } = await import("../src/app/api/legacy/teams/route");
const { deleteTeams, getTeam } = await import("../src/lib/store");
const { hashTeamPin } = await import("../src/lib/team-security");
const { demoTeam } = await import("../src/lib/demo");
function request(url: string, uid?: string, method = "GET", body?: object) {
  return new Request(`http://localhost${url}`, { method, headers: { "Content-Type": "application/json", ...(uid ? auth(uid) : {}) }, body: body ? JSON.stringify(body) : undefined });
}

test("demo fixture is isolated and has exactly 19 unique shirts", () => {
  assert.equal(demoTeam.members.length,19);
  assert.equal(new Set(demoTeam.members.map(m=>m.jerseyNumber)).size,19);
  assert.equal(demoTeam.members.filter(m=>m.id===demoTeam.captainMemberId).length,1);
  assert.ok(demoTeam.members.every(m=>m.dreamTeam?.support?.medical?.length));
});
test("verified membership, captain transfer, atomic shirt choice, and legacy boundary", async () => {
  const newTeam = await create(request("/api/teams", "alice", "POST", { name:"Đội Fixture", jerseyNumber:7, pin:"123456" }));
  assert.equal(newTeam.status,201);
  const slug = (await newTeam.json()).team.slug as string;
  assert.equal((await create(request("/api/teams", "pending", "POST", { name:"Chưa Xác Minh", jerseyNumber:1 }))).status,403);
  assert.equal((await join(request(`/api/teams/${slug}/join`, "pending", "POST", { jerseyNumber:8, pin:"123456" }),context(slug))).status,403);
  assert.equal((await get(request(`/api/teams/${slug}`),context(slug))).status,401);
  assert.equal((await get(request(`/api/teams/${slug}`, "bob"),context(slug))).status,403);
  assert.equal((await patch(request(`/api/teams/${slug}`, "bob", "PATCH", { action:"availability", memberId:"alice", slots:[1] }),context(slug))).status,403);
  assert.equal((await join(request(`/api/teams/${slug}/join`, "bob", "POST", { jerseyNumber:8, pin:"000000" }),context(slug))).status,403);
  const joins = await Promise.all(["bob","carol"].map(uid=>join(request(`/api/teams/${slug}/join`, uid, "POST", { jerseyNumber:8, pin:"123456" }),context(slug))));
  assert.deepEqual(joins.map(r=>r.status).sort(),[200,409]);
  assert.equal((await getTeam(slug)).members.length,2);
  const winner = joins[0].status===200 ? "bob" : "carol";
  const outsider = winner==="bob" ? "carol" : "bob";
  assert.equal((await patch(request(`/api/teams/${slug}`, winner, "PATCH", { action:"availability", memberId:"alice", slots:[1] }),context(slug))).status,403);
  assert.equal((await patch(request(`/api/teams/${slug}`, winner, "PATCH", { action:"dreamTeam", memberId:"alice", formation:"3-1-2", players:{} }),context(slug))).status,403);
  assert.equal((await patch(request(`/api/teams/${slug}`, "alice", "PATCH", { action:"remove", memberId:"alice" }),context(slug))).status,409);
  assert.equal((await patch(request(`/api/teams/${slug}`, winner, "PATCH", { action:"availability", memberId:winner, slots:[1,2] }),context(slug))).status,200);
  assert.equal((await patch(request(`/api/teams/${slug}`, winner, "PATCH", { action:"dreamTeam", memberId:winner, formation:"3-1-2", players:{} }),context(slug))).status,200);
  assert.equal((await patch(request(`/api/teams/${slug}`, "alice", "PATCH", { action:"transferCaptain", memberId:winner }),context(slug))).status,200);
  assert.equal((await patch(request(`/api/teams/${slug}`, "alice", "PATCH", { action:"setPin", pin:null }),context(slug))).status,403);
  assert.equal((await patch(request(`/api/teams/${slug}`, winner, "PATCH", { action:"setPin", pin:null }),context(slug))).status,200);
  assert.equal((await patch(request(`/api/teams/${slug}`, winner, "PATCH", { action:"remove", memberId:"alice" }),context(slug))).status,200);
  const outsideList = await list(request("/api/teams", outsider));
  assert.equal((await outsideList.json()).teams.length,0);
  assert.equal((await list(request("/api/teams", outsider)).then(r=>r.json())).created.length,0);
  const creatorList = await list(request("/api/teams", "alice"));
  assert.equal((await creatorList.json()).created[0].slug,slug);
  assert.equal((await list(request("/api/teams", "alice")).then(r=>r.json())).teams.length,0);
  assert.equal((await deleteTeam(request(`/api/teams/${slug}`, "alice", "DELETE"),context(slug))).status,403);
  assert.rejects(()=>deleteTeams([slug]));
  process.env.TEAM_DELETE_PIN_HASH=hashTeamPin("111111");
  assert.equal((await deleteLegacy(request("/api/legacy/teams", undefined, "DELETE", { slugs:[slug], pin:"111111" }))).status,400);
  const second = await create(request("/api/teams", winner, "POST", { name:"Đội Khác", jerseyNumber:42 }));
  assert.equal(second.status,201);
  assert.equal((await getTeam((await second.json()).team.slug)).members[0].jerseyNumber,42);
  assert.equal((await deleteTeam(request(`/api/teams/${slug}`, winner, "DELETE"),context(slug))).status,200);
  assert.equal((await list(request("/api/teams", "alice")).then(r=>r.json())).created.length,0);
});
test("old team without createdAt upgrades to one year and stays public", async () => {
  const slug="abc123abc123";
  const now=Date.now();
  strings.set(`football:${slug}`, { value:JSON.stringify({slug,name:"Đội Cũ",expiresAt:now+28*86400000,members:[]}), expiresAt:now+28*86400000 });
  const response=await get(request(`/api/teams/${slug}`),context(slug));
  assert.equal(response.status,200);
  const team=await getTeam(slug);
  assert.ok(team.expiresAt-now>360*86400000);
});
test("legacy access PIN and account join PIN are separate", async () => {
  const slug="def456def456";
  const now=Date.now();
  strings.set(`football:${slug}`, { value:JSON.stringify({kind:"legacy",slug,name:"Đội PIN Cũ",createdAt:now,expiresAt:now+365*86400000,members:[],accessPinHash:hashTeamPin("654321")}), expiresAt:now+365*86400000 });
  assert.equal((await get(request(`/api/teams/${slug}`),context(slug))).status,401);
  const accessRequest=new Request(`http://localhost/api/teams/${slug}`,{headers:{"X-Team-Pin":"654321"}});
  assert.equal((await get(accessRequest,context(slug))).status,200);
  assert.equal((await join(request(`/api/teams/${slug}/join`,"bob","POST",{jerseyNumber:9,pin:"654321"}),context(slug))).status,404);
});

test.after(async () => {
  await Promise.all([new Promise<void>(resolve=>redisServer.close(()=>resolve())),new Promise<void>(resolve=>firebaseServer.close(()=>resolve()))]);
});
}
void main();

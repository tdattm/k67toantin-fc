import { body, failure, reply, validName } from "@/lib/api";
import { checkJoinPin, updateAccountTeam, validJersey } from "@/lib/account-store";
import { firebaseUser } from "@/lib/firebase-server";
import { ApiError, getTeam } from "@/lib/store";
export const runtime = "nodejs";
type Context = { params: Promise<{ slug: string }> };
export async function GET(request: Request, context: Context) {
  try {
    await firebaseUser(request, false);
    const team = await getTeam((await context.params).slug);
    if (team.kind !== "account") throw new ApiError(404, "Đội không tồn tại.");
    return reply({ name: team.name, hasPin: Boolean(team.joinPinHash), memberCount: team.members.length });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    const user = await firebaseUser(request);
    const data = await body(request);
    const jersey = validJersey(data.jerseyNumber);
    const slug = (await context.params).slug;
    const current = await getTeam(slug);
    if (current.kind !== "account") throw new ApiError(404, "Đội không tồn tại.");
    if (current.members.some(member => member.uid === user.uid)) return reply({ joined: true });
    await checkJoinPin(slug, user.uid, data.pin, current.joinPinHash);
    await updateAccountTeam(slug, team => {
      if (team.joinPinHash !== current.joinPinHash) throw new ApiError(409, "Mã tham gia vừa thay đổi. Hãy tải lại trang.");
      if (team.members.some(member => member.uid === user.uid)) return;
      if (team.members.length >= 60) throw new ApiError(400, "Mỗi đội tối đa 60 thành viên.");
      if (team.members.some(member => member.jerseyNumber === jersey)) throw new ApiError(409, "Số áo này đã có trong đội.");
      team.members.push({ id: user.uid, uid: user.uid, name: validName(user.name), jerseyNumber: jersey, slots: [], updatedAt: null });
    });
    return reply({ joined: true });
  } catch (error) { return failure(error); }
}

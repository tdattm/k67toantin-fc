import { randomUUID } from "node:crypto";
import { body, failure, reply, validName } from "@/lib/api";
import { ApiError, getTeam, updateTeam } from "@/lib/store";
import { updateAccountTeam, deleteAccountTeam } from "@/lib/account-store";
import { firebaseUser } from "@/lib/firebase-server";
import {
  hashCaptainToken,
  hashTeamPin,
  isCaptainTokenValid,
  newCaptainToken,
  verifyTeamPin,
} from "@/lib/team-security";
import {
  formations,
  isFormation,
  MAX_SUPPORT_PLAYERS,
  normalizeSupport,
  supportRoles,
} from "@/lib/dream-team";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ slug: string }> };
function pinAccess(request: Request, team: Awaited<ReturnType<typeof getTeam>>) {
  if (!team.accessPinHash) return;
  let allowed: boolean;
  try {
    allowed = verifyTeamPin(request.headers.get("x-team-pin"), team.accessPinHash);
  } catch {
    throw new ApiError(503, "Mã PIN của đội không hợp lệ. Hãy báo đội trưởng kiểm tra lại.");
  }
  if (!allowed) throw new ApiError(401, "Bạn cần nhập đúng PIN 6 số để vào đội.");
}

function publicTeam(team: Awaited<ReturnType<typeof getTeam>>) {
  const { accessPinHash: _accessPinHash, captainTokenHash: _captainTokenHash, joinPinHash: _joinPinHash, creatorUid: _creatorUid, ...visible } = team;
  return { ...visible, hasPin: Boolean(team.kind === "account" ? team.joinPinHash : team.accessPinHash) };
}

export async function GET(request: Request, context: Context) {
  try {
    const team = await getTeam((await context.params).slug);
    if (team.kind === "account") {
      const user = await firebaseUser(request);
      if (!team.members.some((member) => member.uid === user.uid)) throw new ApiError(403, "Bạn chưa là thành viên đội này.");
      return reply({ team: publicTeam(team), isCaptain: team.captainUid === user.uid, memberId: user.uid, canClaimCaptain: false });
    }
    pinAccess(request, team);
    return reply({
      team: publicTeam(team),
      isCaptain: isCaptainTokenValid(team.captainTokenHash, request.headers.get("x-captain-token")),
      canClaimCaptain: !team.captainTokenHash,
    });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const data = await body(request);
    const slug = (await context.params).slug;
    const existing = await getTeam(slug);
    const user = existing.kind === "account" ? await firebaseUser(request) : null;
    const captainToken = request.headers.get("x-captain-token");
    let captainTransferToken: string | undefined;
    if (!user && (data.action === "transferCaptain" || data.action === "claimCaptain"))
      captainTransferToken = newCaptainToken();
    const edit = (team: Awaited<ReturnType<typeof getTeam>>) => {
      if (user) {
        if (team.kind !== "account") throw new ApiError(409, "Chế độ đội đã thay đổi.");
        if (!team.members.some((member) => member.uid === user.uid)) throw new ApiError(403, "Bạn chưa là thành viên đội này.");
        if (["setPin", "transferCaptain", "remove"].includes(data.action) && team.captainUid !== user.uid)
          throw new ApiError(403, "Chỉ đội trưởng hiện tại được thực hiện thao tác này.");
        if (["availability", "dreamTeam"].includes(data.action) && data.memberId !== user.uid)
          throw new ApiError(403, "Chỉ được sửa lịch và Dream Team của chính mình.");
        if (data.action === "leave" && data.memberId !== user.uid)
          throw new ApiError(403, "Chỉ được rời đội bằng tài khoản của mình.");
        if (["add", "claimCaptain"].includes(data.action)) throw new ApiError(403, "Thành viên đội mới phải tự tham gia bằng tài khoản.");
      } else {
        if (team.kind === "account") throw new ApiError(403, "Đội tài khoản cần xác thực Firebase.");
        pinAccess(request, team);
      }
      if (data.action === "setPin") {
        if (user) {
          if (data.pin === null || data.pin === "") delete team.joinPinHash;
          else if (typeof data.pin !== "string" || !/^\d{6}$/.test(data.pin)) throw new ApiError(400, "Mã tham gia phải có đúng 6 chữ số.");
          else team.joinPinHash = hashTeamPin(data.pin);
          return;
        }
        if (!isCaptainTokenValid(team.captainTokenHash, captainToken))
          throw new ApiError(403, "Chỉ đội trưởng mới được tạo hoặc sửa PIN của đội.");
        if (data.pin === null || data.pin === "") delete team.accessPinHash;
        else if (typeof data.pin !== "string" || !/^\d{6}$/.test(data.pin))
          throw new ApiError(400, "PIN đội phải gồm đúng 6 chữ số.");
        else team.accessPinHash = hashTeamPin(data.pin);
      } else if (data.action === "transferCaptain" || data.action === "claimCaptain") {
        if (user) {
          if (data.action !== "transferCaptain") throw new ApiError(403, "Thao tác không hợp lệ.");
          const target = team.members.find((member) => member.id === data.memberId && member.uid);
          if (!target) throw new ApiError(404, "Thành viên nhận quyền không còn trong đội.");
          team.captainUid = target.uid;
          team.captainMemberId = target.id;
          return;
        }
        const claiming = data.action === "claimCaptain";
        if (claiming ? team.captainTokenHash : !isCaptainTokenValid(team.captainTokenHash, captainToken))
          throw new ApiError(403, claiming ? "Đội đã có đội trưởng." : "Chỉ đội trưởng mới được nhượng quyền.");
        if (typeof data.memberId !== "string" || !team.members.some((member) => member.id === data.memberId))
          throw new ApiError(404, "Thành viên nhận quyền không còn trong đội.");
        team.captainMemberId = data.memberId;
        team.captainTokenHash = hashCaptainToken(captainTransferToken!);
      } else if (data.action === "add") {
        const name = validName(data.name);
        const nameWordCount = name.split(/\s+/).length;
        if (nameWordCount < 2)
          throw new ApiError(400, "Tên thành viên cần có ít nhất họ và tên.");
        if (nameWordCount === 2 && data.allowShortName !== true)
          throw new ApiError(
            400,
            "Vui lòng xác nhận tên có hai từ trước khi tiếp tục.",
          );
        const jerseyNumber = data.jerseyNumber;
        if (
          typeof jerseyNumber !== "number" ||
          !Number.isInteger(jerseyNumber) ||
          jerseyNumber < 0 ||
          jerseyNumber > 99
        )
          throw new ApiError(400, "Số áo phải là số nguyên từ 0 đến 99.");
        if (team.members.length >= 60)
          throw new ApiError(400, "Mỗi đội tối đa 60 thành viên.");
        if (team.members.some((m) => m.jerseyNumber === jerseyNumber))
          throw new ApiError(
            409,
            "Số áo này đã có trong đội. Hãy chọn số áo khác.",
          );
        team.members.push({
          id: randomUUID(),
          name,
          jerseyNumber,
          slots: [],
          updatedAt: null,
        });
      } else if (data.action === "dreamTeam") {
        const member = team.members.find((m) => m.id === data.memberId);
        if (!member) throw new ApiError(404, "Thành viên không còn trong đội.");
        const formation: unknown = data.formation;
        if (!isFormation(formation))
          throw new ApiError(400, "Sơ đồ không hợp lệ.");
        if (
          !data.players ||
          typeof data.players !== "object" ||
          Array.isArray(data.players)
        )
          throw new ApiError(400, "Danh sách cầu thủ không hợp lệ.");
        const entries = Object.entries(data.players);
        const positions = formations[formation].map((p) => p.id);
        const memberIds = new Set(team.members.map((m) => m.id));
        if (
          entries.some(
            ([position, id]) =>
              !positions.includes(position) ||
              typeof id !== "string" ||
              !memberIds.has(id),
          )
        )
          throw new ApiError(
            400,
            "Vị trí hoặc cầu thủ không còn hợp lệ. Hãy tải lại đội.",
          );
        if (new Set(entries.map(([, id]) => id)).size !== entries.length)
          throw new ApiError(
            400,
            "Mỗi cầu thủ chỉ được xuất hiện ở một vị trí.",
          );
        const supportData = data.support;
        if (
          supportData !== undefined &&
          (typeof supportData !== "object" ||
            supportData === null ||
            Array.isArray(supportData))
        )
          throw new ApiError(400, "Danh sách vị trí phụ không hợp lệ.");
        const supportEntries = Object.entries(supportData ?? {});
        if (supportEntries.some(([role]) => !supportRoles.some((item) => item.id === role)))
          throw new ApiError(400, "Vị trí phụ hoặc cầu thủ không còn hợp lệ.");
        const normalizedSupportEntries = supportEntries.map(([role, value]) => {
          const ids = Array.isArray(value)
            ? Array.from(value)
            : typeof value === "string"
              ? [value]
              : null;
          if (
            !ids ||
            ids.length > MAX_SUPPORT_PLAYERS ||
            !ids.every((id) => typeof id === "string" && memberIds.has(id))
          )
            throw new ApiError(400, "Vị trí phụ hoặc cầu thủ không còn hợp lệ.");
          return [role, ids] as const;
        });
        const supportIds = normalizedSupportEntries.flatMap(([, ids]) => ids);
        if (
          new Set([...entries.map(([, id]) => id), ...supportIds]).size !==
          entries.length + supportIds.length
        )
          throw new ApiError(
            400,
            "Mỗi cầu thủ chỉ được chọn một vị trí trong đội hình.",
          );
        member.dreamTeam = {
          formation,
          players: Object.fromEntries(entries) as Record<string, string>,
          support: Object.fromEntries(normalizedSupportEntries),
          updatedAt: new Date().toISOString(),
        };
      } else if (data.action === "remove" || data.action === "leave" || data.action === "availability") {
        const member = team.members.find((m) => m.id === data.memberId);
        if (!member) throw new ApiError(404, "Thành viên không còn trong đội.");
        if (data.action === "remove" || data.action === "leave") {
          if (data.memberId === team.captainMemberId)
            throw new ApiError(409, "Hãy nhượng quyền đội trưởng trước khi xóa thành viên này.");
          team.members = team.members.filter((m) => m.id !== data.memberId);
          for (const remaining of team.members) {
            if (remaining.dreamTeam) {
              remaining.dreamTeam.players = Object.fromEntries(
                Object.entries(remaining.dreamTeam.players).filter(
                  ([, id]) => id !== data.memberId,
                ),
              );
              if (remaining.dreamTeam.support) {
                const support = normalizeSupport(remaining.dreamTeam.support);
                for (const role of supportRoles) {
                  const ids = support[role.id]?.filter(
                    (id) => id !== data.memberId,
                  );
                  if (ids?.length) support[role.id] = ids;
                  else delete support[role.id];
                }
                remaining.dreamTeam.support = support;
              }
            }
          }
        } else {
          if (
            !Array.isArray(data.slots) ||
            data.slots.length > 21 ||
            !data.slots.every(
              (v: unknown) =>
                typeof v === "number" &&
                Number.isInteger(v) &&
                v >= 0 &&
                v < 21,
            )
          )
            throw new ApiError(400, "Khung giờ không hợp lệ.");
          member.slots = [...new Set<number>(data.slots)].sort((a, b) => a - b);
          member.updatedAt = new Date().toISOString();
        }
      } else throw new ApiError(400, "Thao tác không hợp lệ.");
    };
    const team = user ? await updateAccountTeam(slug, edit) : await updateTeam(slug, edit);
    return reply({
      team: publicTeam(team),
      isCaptain: user ? team.captainUid === user.uid :
        data.action === "claimCaptain" ||
        isCaptainTokenValid(team.captainTokenHash, captainToken),
      ...(user ? { memberId: user.uid } : {}),
      ...(captainTransferToken ? { captainTransferToken } : {}),
    });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const slug = (await context.params).slug;
    const team = await getTeam(slug);
    if (team.kind !== "account") throw new ApiError(403, "Đội legacy dùng đường quản trị riêng.");
    const user = await firebaseUser(request);
    await deleteAccountTeam(slug, user.uid);
    return reply({ deletedCount: 1 });
  } catch (error) { return failure(error); }
}

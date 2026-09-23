import { randomUUID } from "node:crypto";
import { body, failure, reply, validName } from "@/lib/api";
import { ApiError, getTeam, updateTeam } from "@/lib/store";
import { formations, isFormation } from "@/lib/dream-team";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ slug: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    return reply({ team: await getTeam((await context.params).slug) });
  } catch (error) {
    return failure(error);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    const data = await body(request);
    const team = await updateTeam((await context.params).slug, (team) => {
      if (data.action === "add") {
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
        member.dreamTeam = {
          formation,
          players: Object.fromEntries(entries) as Record<string, string>,
          updatedAt: new Date().toISOString(),
        };
      } else if (data.action === "remove" || data.action === "availability") {
        const member = team.members.find((m) => m.id === data.memberId);
        if (!member) throw new ApiError(404, "Thành viên không còn trong đội.");
        if (data.action === "remove") {
          team.members = team.members.filter((m) => m.id !== data.memberId);
          for (const remaining of team.members) {
            if (remaining.dreamTeam) {
              remaining.dreamTeam.players = Object.fromEntries(
                Object.entries(remaining.dreamTeam.players).filter(
                  ([, id]) => id !== data.memberId,
                ),
              );
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
    });
    return reply({ team });
  } catch (error) {
    return failure(error);
  }
}

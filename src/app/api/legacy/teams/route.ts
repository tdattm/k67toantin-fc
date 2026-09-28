import { body, failure, reply } from "@/lib/api";
import { isDeletePinConfigured, verifyDeletePin } from "@/lib/delete-pin";
import { checkDeletePinRateLimit, clearDeletePinRateLimit, deleteTeams, ApiError } from "@/lib/store";
export const runtime = "nodejs";
export async function DELETE(request: Request) {
  try {
    if (!isDeletePinConfigured()) throw new ApiError(503, "Chưa cấu hình mã quản trị legacy.");
    const data = await body(request);
    if (!Array.isArray(data.slugs) || !data.slugs.length || data.slugs.length > 60 ||
      data.slugs.some((slug: unknown) => typeof slug !== "string" || !/^[a-f0-9]{12}$/.test(slug)))
      throw new ApiError(400, "Danh sách đội không hợp lệ.");
    const ip = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!(await checkDeletePinRateLimit(ip))) throw new ApiError(429, "Thử mã quá nhiều lần. Hãy đợi 15 phút.");
    if (!verifyDeletePin(data.pin)) throw new ApiError(403, "Mã quản trị không đúng.");
    const result = await deleteTeams(data.slugs);
    await clearDeletePinRateLimit(ip);
    return reply(result);
  } catch (error) { return failure(error); }
}

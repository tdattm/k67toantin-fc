import { ApiError, storageMode } from "./store";
export function reply(data: unknown, status = 200) {
  return Response.json(
    { ...(data as object), storageMode },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
export function failure(error: unknown) {
  if (error instanceof ApiError)
    return reply({ error: error.message }, error.status);
  if (error instanceof SyntaxError)
    return reply({ error: "Dữ liệu không hợp lệ." }, 400);
  console.error("Team API error:", error);
  return reply(
    { error: "Chưa thể lưu hoặc tải dữ liệu. Vui lòng thử lại sau." },
    503,
  );
}
export async function body(request: Request) {
  const text = await request.text();
  if (text.length > 8192) throw new ApiError(413, "Dữ liệu quá lớn.");
  const data = JSON.parse(text);
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new ApiError(400, "Dữ liệu không hợp lệ.");
  return data;
}
export function validName(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 50)
    throw new ApiError(400, "Tên cần có từ 1 đến 50 ký tự.");
  return value.trim().replace(/\s+/g, " ");
}

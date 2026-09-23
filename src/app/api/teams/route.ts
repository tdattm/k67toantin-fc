import { body, failure, reply, validName } from "@/lib/api";
import { createTeam } from "@/lib/store";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const data = await body(request);
    return reply({ team: await createTeam(validName(data.name)) }, 201);
  } catch (error) {
    return failure(error);
  }
}

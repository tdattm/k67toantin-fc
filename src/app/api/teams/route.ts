import { body, failure, reply, validName } from "@/lib/api";
import { createAccountTeam, listAccountTeams, validJersey } from "@/lib/account-store";
import { firebaseUser } from "@/lib/firebase-server";
import { ApiError } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await firebaseUser(request, false);
    return reply(await listAccountTeams(user.uid));
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const user = await firebaseUser(request);
    const data = await body(request);
    const pin = data.pin === undefined || data.pin === null || data.pin === "" ? undefined : data.pin;
    if (pin !== undefined && (typeof pin !== "string" || !/^\d{6}$/.test(pin)))
      throw new ApiError(400, "Mã tham gia phải có đúng 6 chữ số.");
    const team = await createAccountTeam(validName(data.name), user.uid, validName(user.name), validJersey(data.jerseyNumber), pin);
    return reply({ team: { ...team, joinPinHash: undefined, hasPin: Boolean(pin) } }, 201);
  } catch (error) { return failure(error); }
}

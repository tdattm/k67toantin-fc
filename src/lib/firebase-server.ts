import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { ApiError } from "./store";

function auth() {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    if (!projectId) throw new ApiError(503, "Firebase chưa được cấu hình.");
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    initializeApp(clientEmail && privateKey
      ? { credential: cert({ projectId, clientEmail, privateKey }), projectId }
      : { projectId });
  }
  return getAuth();
}

export async function firebaseUser(request: Request, verified = true) {
  const bearer = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!bearer) throw new ApiError(401, "Hãy đăng nhập để tiếp tục.");
  try {
    const decoded = await auth().verifyIdToken(bearer, true);
    const user = await auth().getUser(decoded.uid);
    if (user.disabled) throw new ApiError(403, "Tài khoản đã bị khóa.");
    if (verified && !user.emailVerified) throw new ApiError(403, "Hãy xác minh email trước khi tạo hoặc tham gia đội.");
    return { uid: user.uid, name: user.displayName?.trim() || "", emailVerified: user.emailVerified };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Phiên đăng nhập không hợp lệ. Hãy đăng nhập lại.");
  }
}

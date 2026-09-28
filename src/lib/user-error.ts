const firebaseAuthMessages: Record<string, string> = {
  "auth/invalid-credential": "Email hoặc mật khẩu chưa đúng. Hãy kiểm tra lại rồi thử lại.",
  "auth/invalid-login-credentials": "Email hoặc mật khẩu chưa đúng. Hãy kiểm tra lại rồi thử lại.",
  "auth/wrong-password": "Email hoặc mật khẩu chưa đúng. Hãy kiểm tra lại rồi thử lại.",
  "auth/user-not-found": "Email hoặc mật khẩu chưa đúng. Hãy kiểm tra lại rồi thử lại.",
  "auth/email-already-in-use": "Email này đã được dùng. Hãy đăng nhập hoặc đặt lại mật khẩu.",
  "auth/invalid-email": "Địa chỉ email chưa đúng định dạng. Hãy kiểm tra lại.",
  "auth/weak-password": "Mật khẩu chưa đáp ứng yêu cầu tối thiểu 8 ký tự.",
  "auth/password-does-not-meet-requirements": "Mật khẩu chưa đáp ứng yêu cầu tối thiểu 8 ký tự.",
  "auth/too-many-requests": "Bạn đã thử hoặc yêu cầu quá nhiều lần. Hãy chờ một lúc rồi thử lại.",
  "auth/network-request-failed": "Không thể kết nối tới dịch vụ. Hãy kiểm tra mạng rồi thử lại.",
  "auth/user-disabled": "Tài khoản này hiện không thể đăng nhập. Hãy liên hệ người quản lý.",
  "auth/operation-not-allowed": "Tính năng này chưa được bật. Hãy liên hệ người quản lý.",
  "auth/expired-action-code": "Liên kết đã hết hạn. Hãy yêu cầu gửi liên kết mới.",
  "auth/invalid-action-code": "Liên kết không còn hợp lệ. Hãy yêu cầu gửi liên kết mới.",
  "auth/quota-exceeded": "Dịch vụ email đang tạm chạm giới hạn gửi. Hãy chờ rồi thử lại.",
  "auth/unauthorized-domain": "Tên miền hiện tại chưa được cho phép đăng nhập. Hãy liên hệ người quản lý.",
  "auth/requires-recent-login": "Phiên đăng nhập đã cũ. Hãy đăng nhập lại rồi thử lại.",
};

export function userFacingError(
  error: unknown,
  fallback: string,
  overrides: Record<string, string> = {},
) {
  const code = typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
    ? error.code.toLowerCase()
    : "";
  if (code) return overrides[code] || firebaseAuthMessages[code] || fallback;

  const message = error instanceof Error ? error.message.trim() : "";
  const codeInMessage = message.match(/auth\/[a-z0-9-]+/i)?.[0]?.toLowerCase();
  if (codeInMessage) return overrides[codeInMessage] || firebaseAuthMessages[codeInMessage] || fallback;
  if (/firebase:\s*error|failed to fetch|networkerror|load failed/i.test(message))
    return "Không thể kết nối hoặc hoàn tất yêu cầu. Hãy thử lại sau ít phút.";
  if (/^(?:[\w.]+Error|Firebase(?:Error)?|Error|Request failed):?/i.test(message) || /^[\x00-\x7f]+$/.test(message))
    return fallback;

  return message || fallback;
}

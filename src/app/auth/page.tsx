"use client";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { browserSessionPersistence, createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { clientAuth } from "@/lib/firebase-client";
import { userFacingError } from "@/lib/user-error";
import { Shell } from "@/components/shell";

function AuthForm() {
  const params = useSearchParams();
  const router = useRouter();
  const nextPath = params.get("next")?.startsWith("/team/") ? params.get("next")! : "/dashboard";
  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : params.get("mode") === "reset" ? "reset" : "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    let createdThisAttempt = false;
    try {
      if (mode === "reset") {
        try { await sendPasswordResetEmail(clientAuth, email.trim()); } catch { /* same public response */ }
        setMessage("Nếu email có tài khoản, Firebase sẽ gửi link đặt lại mật khẩu. Hãy kiểm tra hộp thư.");
      } else if (mode === "register") {
        if (!name.trim() || password.length < 8) throw new Error("Nhập tên và mật khẩu tối thiểu 8 ký tự.");
        await setPersistence(clientAuth, browserSessionPersistence);
        const credential = await createUserWithEmailAndPassword(clientAuth, email.trim(), password);
        createdThisAttempt = true;
        setAccountCreated(true);
        await updateProfile(credential.user, { displayName: name.trim() });
        await sendEmailVerification(credential.user);
        router.push(nextPath);
      } else {
        await setPersistence(clientAuth, browserSessionPersistence);
        await signInWithEmailAndPassword(clientAuth, email.trim(), password);
        router.push(nextPath);
      }
    } catch (error) {
      const fallback = createdThisAttempt
        ? "Tài khoản đã được tạo nhưng chưa gửi được email xác minh. Hãy chờ một lúc, mở dashboard để gửi lại và kiểm tra thư mục Spam/Thư rác."
        : "Không thể hoàn tất yêu cầu. Hãy kiểm tra thông tin rồi thử lại.";
      const overrides: Record<string, string> = createdThisAttempt ? {
        "auth/too-many-requests": "Tài khoản đã được tạo nhưng dịch vụ email tạm giới hạn gửi xác minh. Hãy chờ một lúc, mở dashboard để gửi lại và kiểm tra thư mục Spam/Thư rác.",
      } : {};
      setMessage(userFacingError(error, fallback, overrides));
    }
    finally { setBusy(false); }
  }
  return <Shell><section className="panel mx-auto max-w-lg p-7 sm:p-10">
    <p className="eyebrow">TÀI KHOẢN</p>
    <h1 className="mt-3 text-3xl font-bold">{mode === "register" ? "Đăng ký" : mode === "reset" ? "Quên mật khẩu" : "Đăng nhập"}</h1>
    <form onSubmit={submit} className="mt-6 space-y-4">
      {mode === "register" && <label className="label block">Tên hiển thị<input className="input mt-2" required maxLength={50} value={name} onChange={e => setName(e.target.value)}/></label>}
      <label className="label block">Email cá nhân<input className="input mt-2" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)}/></label>
      {mode !== "reset" && <label className="label block">Mật khẩu<input className="input mt-2" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} minLength={mode === "register" ? 8 : undefined} required value={password} onChange={e => setPassword(e.target.value)}/></label>}
      {mode === "register" && <p className="text-xs text-emerald-100/60">Tối thiểu 8 ký tự. Không yêu cầu chữ hoa, số hay ký tự đặc biệt.</p>}
      <button disabled={busy} className="primary w-full">{busy ? "Đang xử lý…" : mode === "register" ? "Tạo tài khoản" : mode === "reset" ? "Gửi link đặt lại" : "Đăng nhập"}</button>
    </form>
    {message && <p role="status" className="mt-4 text-sm text-amber-200">{message}</p>}
    {accountCreated && <Link href="/dashboard" className="mt-4 inline-block text-sm text-amber-200 underline">Mở dashboard để kiểm tra xác minh email</Link>}
    <div className="mt-6 flex flex-wrap gap-4 text-sm underline">
      {mode !== "login" && <button onClick={() => setMode("login")}>Đăng nhập</button>}
      {mode !== "register" && <button onClick={() => setMode("register")}>Đăng ký</button>}
      {mode !== "reset" && <button onClick={() => setMode("reset")}>Quên mật khẩu</button>}
    </div>
    <Link href="/" className="mt-6 block text-sm text-emerald-100/60">← Home</Link>
  </section></Shell>;
}
export default function AuthPage() { return <Suspense><AuthForm/></Suspense>; }

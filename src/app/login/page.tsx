import { LoginForm } from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-red-600 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-black text-white uppercase">NEW VERSION TEST</h1>
          <p className="mt-1 text-sm text-white opacity-80">If you see this red screen, the build is working.</p>
        </div>
        <div className="rounded-lg border border-ink-100 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}

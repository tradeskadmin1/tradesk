"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"



type AuthMode = "login" | "register"

export default function AuthPage() {
    const router = useRouter()
    const [mode, setMode] = useState<AuthMode>("login")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [googleLoading, setGoogleLoading] = useState(false)
    const [forgotLoading, setForgotLoading] = useState(false)
    const [forgotSent, setForgotSent] = useState(false)
    const [confirmSent, setConfirmSent] = useState(false)
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirm: "",
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const switchMode = (next: AuthMode) => {
        setMode(next)
        setError(null)
        setForgotSent(false)
        setConfirmSent(false)
        setForm({ name: "", email: "", password: "", confirm: "" })
    }

    const handleGoogle = async () => {
        setGoogleLoading(true)
        setError(null)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        })
        if (error) {
            setError(error.message)
            setGoogleLoading(false)
        }
    }

   
    const handleForgotPassword = async () => {
        if (!form.email) {
            setError("Enter your email address above, then click Forgot password.")
            return
        }
        setForgotLoading(true)
        setError(null)
        const { error } = await supabase.auth.resetPasswordForEmail(form.email, {
            redirectTo: `${window.location.origin}/auth/reset-password`,
        })
        setForgotLoading(false)
        if (error) {
            setError(error.message)
        } else {
            setForgotSent(true)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        if (mode === "register" && form.password !== form.confirm) {
            setError("Passwords do not match.")
            return
        }
        if (form.password.length < 8) {
            setError("Password must be at least 8 characters.")
            return
        }

        setLoading(true)

        if (mode === "register") {
            const { data, error: signUpError } = await supabase.auth.signUp({
                email: form.email,
                password: form.password,
                options: {
                    data: { full_name: form.name },
                },
            })
            if (signUpError) {
                setError(signUpError.message)
                setLoading(false)
                return
            }

            if (!data.session) {
                setLoading(false)
                setConfirmSent(true)
                return
            }

            if (data.user) {
                const { error: insertError } = await supabase.from("users").insert({
                    id: data.user.id,
                    email: form.email,
                    name: form.name,
                    onboarded: false,
                })
                if (insertError) {
                    console.error("[auth] users insert failed:", insertError.message)
                }
                setLoading(false)
                router.push("/onboarding")
            } else {
                setLoading(false)
            }

        } else {
            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
            })
            if (signInError) {
                setError(signInError.message)
                setLoading(false)
                return
            }
            if (data.user) {
                const { data: userData } = await supabase
                    .from("users")
                    .select("onboarded")
                    .eq("id", data.user.id)
                    .single()
                setLoading(false)
                if (userData?.onboarded) {
                    router.push("/dashboard")
                } else {
                    router.push("/onboarding")
                }
            } else {
                setLoading(false)
            }
        }
    }

    const isLogin = mode === "login"

    if (confirmSent) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
                <div className="w-full max-w-105 bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
                    <div className="bg-[#080b10] border-b border-white/8 px-5 py-3 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                        <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                        <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                        <span className="font-mono text-[11px] text-[#6b7a8d] ml-3 tracking-wider">
                            tradesk://auth/verify
                        </span>
                    </div>
                    <div className="px-8 pt-8 pb-10 flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-2xl">
                            ✉️
                        </div>
                        <h2 className="font-display text-[22px] font-bold text-white">Check your inbox</h2>
                        <p className="font-mono text-[13px] text-[#6b7a8d] max-w-xs">
                            We sent a confirmation link to <span className="text-white">{form.email}</span>.
                            Click it to activate your account, then sign in.
                        </p>
                        <button
                            onClick={() => { setConfirmSent(false); switchMode("login") }}
                            className="mt-2 font-mono text-[13px] text-[#FF5733] hover:text-[#ff6a4d] transition-colors cursor-pointer font-semibold"
                        >
                            Back to Sign In →
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
            <div className="w-full max-w-105 bg-[#0d1117] border border-white/8 rounded-2xl overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.6)]">
                <div className="bg-[#080b10] border-b border-white/8 px-5 py-3 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
                    <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
                    <div className="w-2 h-2 rounded-full bg-[#28c840]" />
                    <span className="font-mono text-[11px] text-[#6b7a8d] ml-3 tracking-wider">
                        tradesk://auth
                    </span>
                </div>

                <div className="px-8 pt-6 pb-8">
                    <div onClick={() => router.push("/")} className="flex flex-col mb-4 cursor-pointer">
                        <div className="flex items-center gap-3">
                            <Image src="/logo.png" alt="Tradesk" width={34} height={34} />
                            <span className="font-display text-[17px] font-bold text-white">
                                Trade<span className="text-[#FF5733]">sk</span>
                            </span>
                        </div>
                        <span className="text-[#7a6a5a] text-[12px] font-mono">Your desk, Your edge.</span>
                    </div>

                    <h1 className="font-display text-[26px] font-bold text-white leading-tight mb-1.5">
                        {isLogin ? "Welcome back" : "Create account"}
                    </h1>
                    <p className="font-mono text-[13px] text-[#6b7a8d] mb-7">
                        {isLogin
                            ? "Sign in to access your trading terminal."
                            : "Start trading on-chain in under a minute."}
                    </p>

                    <div className="flex bg-[#080b10] border border-white/8 rounded-xl p-1 mb-7">
                        {(["login", "register"] as AuthMode[]).map((m) => (
                            <button
                                key={m}
                                onClick={() => switchMode(m)}
                                className={`flex-1 py-2 rounded-[9px] font-mono text-[12px] font-semibold transition-all duration-200 cursor-pointer capitalize
                                    ${mode === m
                                        ? "bg-[#FF5733] text-white shadow-[0_4px_12px_rgba(255,87,51,0.3)]"
                                        : "text-[#6b7a8d] hover:text-white"
                                    }`}
                            >
                                {m === "login" ? "Sign In" : "Register"}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-2.5 mb-6">
                        <button
                            onClick={handleGoogle}
                            disabled={googleLoading}
                            className="group w-full flex items-center justify-center gap-3 bg-white hover:bg-white/90 rounded-xl px-4 py-3 transition-all duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {googleLoading ? (
                                <span className="flex gap-1">
                                    {[0, 1, 2].map((i) => (
                                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#4285F4] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                    ))}
                                </span>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            )}
                            <span className="font-mono text-[13px] text-[#111] font-semibold">
                                {googleLoading ? "Connecting..." : "Continue with Google"}
                            </span>
                        </button>


                        <div className="relative">
                            <button
                                disabled
                                className="w-full flex items-center justify-center gap-3 bg-[#1a1a1a] border border-white/10 rounded-xl px-4 py-3 opacity-50 cursor-not-allowed"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                </svg>
                                <span className="font-mono text-[13px] text-white font-semibold">
                                    Continue with Apple
                                </span>
                            </button>
                            <span className="absolute -top-2 right-3 bg-[#FF5733] text-white font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                                Coming Soon
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="font-mono text-[11px] text-[#6b7a8d] tracking-widest uppercase">or</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    {forgotSent && (
                        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 font-mono text-[12px] text-emerald-400">
                            Password reset link sent — check your inbox.
                        </div>
                    )}

                    {error && (
                        <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 font-mono text-[12px] text-rose-400">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
                        {!isLogin && (
                            <div className="flex flex-col gap-1.5">
                                <label className="font-mono text-[11px] text-[#6b7a8d] tracking-wider uppercase">Full name</label>
                                <input
                                    name="name"
                                    type="text"
                                    placeholder="Alex Okonkwo"
                                    value={form.name}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#080b10] border border-white/8 focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 font-mono text-[13px] text-white placeholder:text-[#6b7a8d]/50 transition-colors duration-200"
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] text-[#6b7a8d] tracking-wider uppercase">Email address</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={handleChange}
                                required
                                className="w-full bg-[#080b10] border border-white/8 focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 font-mono text-[13px] text-white placeholder:text-[#6b7a8d]/50 transition-colors duration-200"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <label className="font-mono text-[11px] text-[#6b7a8d] tracking-wider uppercase">Password</label>
                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        disabled={forgotLoading}
                                        className="font-mono text-[11px] text-[#FF5733] hover:text-[#ff6a4d] transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        {forgotLoading ? "Sending..." : "Forgot password?"}
                                    </button>
                                )}
                            </div>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder={isLogin ? "Enter your password" : "Min. 8 characters"}
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full bg-[#080b10] border border-white/8 focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 pr-11 font-mono text-[13px] text-white placeholder:text-[#6b7a8d]/50 transition-colors duration-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b7a8d] hover:text-white transition-colors cursor-pointer"
                                >
                                    <Image src={showPassword ? "/hide.png" : "/show.png"} alt="toggle" width={20} height={20} />
                                </button>
                            </div>
                        </div>

                        {!isLogin && (
                            <div className="flex flex-col gap-1.5">
                                <label className="font-mono text-[11px] text-[#6b7a8d] tracking-wider uppercase">Confirm password</label>
                                <div className="relative">
                                    <input
                                        name="confirm"
                                        type={showConfirm ? "text" : "password"}
                                        placeholder="Re-enter your password"
                                        value={form.confirm}
                                        onChange={handleChange}
                                        required
                                        className="w-full bg-[#080b10] border border-white/8 focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 pr-11 font-mono text-[13px] text-white placeholder:text-[#6b7a8d]/50 transition-colors duration-200"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm((p) => !p)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b7a8d] hover:text-white transition-colors cursor-pointer"
                                    >
                                        <Image src={showConfirm ? "/hide.png" : "/show.png"} alt="toggle" width={20} height={20} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isLogin && (
                            <label className="flex items-start gap-2.5 cursor-pointer mt-1">
                                <input type="checkbox" required className="mt-0.5 accent-[#FF5733] cursor-pointer" />
                                <span className="font-mono text-[11px] text-[#6b7a8d] leading-relaxed">
                                    I agree to the{" "}
                                    <span className="text-[#FF5733] hover:underline cursor-pointer">Terms of Service</span>{" "}
                                    and{" "}
                                    <span className="text-[#FF5733] hover:underline cursor-pointer">Privacy Policy</span>
                                </span>
                            </label>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-1 py-3.5 rounded-xl font-mono text-[14px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(255,87,51,0.35)] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="flex gap-1">
                                        {[0, 1, 2].map((i) => (
                                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                                        ))}
                                    </span>
                                    {isLogin ? "Signing in..." : "Creating account..."}
                                </span>
                            ) : (
                                isLogin ? "Sign In →" : "Create Account →"
                            )}
                        </button>
                    </form>

                    <p className="font-mono text-[12px] text-[#6b7a8d] text-center mt-6">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => switchMode(isLogin ? "register" : "login")}
                            className="text-[#FF5733] hover:text-[#ff6a4d] transition-colors cursor-pointer font-semibold"
                        >
                            {isLogin ? "Register" : "Sign In"}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    )
}
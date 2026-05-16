"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Topbar from "../../components/topbar"
import Sidebar from "../../components/sidebar"
import dynamic from "next/dynamic"

// Sumsub SDK is DOM-heavy — load client-side only
const SumsubWebSdk = dynamic(() => import("@sumsub/websdk-react"), { ssr: false })

type KycStatus = "none" | "pending" | "approved" | "rejected"

interface KycState {
  kycStatus: KycStatus
  kycSubmittedAt: string | null
  submission: {
    id: string
    status: string
    full_name: string | null
    submitted_at: string
    reviewed_at: string | null
    provider: string | null
  } | null
}


// ─── Status banner ────────────────────────────────────────────────────────────
function StatusBanner({ state }: { state: KycState }) {
  if (state.kycStatus === "approved") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
          ✓
        </div>
        <div>
          <h2 className="text-xl font-bold text-white font-mono">Identity Verified</h2>
          <p className="text-sm text-[#7a6a5a] mt-1 font-mono">
            Your account is fully verified. All features are unlocked.
          </p>
        </div>
        {state.submission?.reviewed_at && (
          <p className="font-mono text-[10px] text-[#4a3a2a]">
            Approved on {new Date(state.submission.reviewed_at).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        )}
      </div>
    )
  }

  if (state.kycStatus === "pending") {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center">
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <span key={i} className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white font-mono">Under Review</h2>
          <p className="text-sm text-[#7a6a5a] mt-1 font-mono">
            {state.submission?.provider === "sumsub"
              ? "Your identity is being verified automatically. This usually takes under a minute."
              : "Your documents are being reviewed. This typically takes 1–2 business days."}
          </p>
        </div>
        {state.kycSubmittedAt && (
          <p className="font-mono text-[10px] text-[#4a3a2a]">
            Submitted {new Date(state.kycSubmittedAt).toLocaleDateString("en-US", {
              year: "numeric", month: "long", day: "numeric",
            })}
          </p>
        )}
      </div>
    )
  }

  return null
}


// ─── Sumsub widget ────────────────────────────────────────────────────────────
function SumsubWidget({
  onSubmitted,
  onError,
}: {
  onSubmitted: (applicantId: string) => void
  onError: (msg: string) => void
}) {
  const [token, setToken]     = useState<string | null>(null)
  const [tokenErr, setTokenErr] = useState<string | null>(null)
  const applicantIdRef          = useRef<string | null>(null)

  const fetchToken = useCallback(async (): Promise<string> => {
    const res = await fetch("/api/kyc/sumsub/token")
    if (!res.ok) throw new Error("Failed to load verification session")
    const data = await res.json() as { token: string }
    return data.token
  }, [])

  useEffect(() => {
    fetchToken()
      .then(setToken)
      .catch(() => setTokenErr("Could not load the verification widget. Try the manual option below."))
  }, [fetchToken])

  const handleMessage = useCallback((type: string, payload: any) => {
    if (type === "idCheck.onApplicantLoaded") {
      applicantIdRef.current = payload?.applicantId ?? null
    }
    if (type === "idCheck.onApplicantSubmitted") {
      const id = payload?.applicantId ?? applicantIdRef.current
      if (id) onSubmitted(id)
    }
    if (type === "idCheck.onError") {
      onError(payload?.message ?? "Verification failed. Please try again.")
    }
  }, [onSubmitted, onError])

  const handleError = useCallback((data: any) => {
    console.error("[SumsubWidget] error", data)
    onError("Verification widget error. Try the manual option below.")
  }, [onError])

  if (tokenErr) {
    return (
      <div className="font-mono text-[11px] text-[#FF5733] bg-[#FF5733]/5 border border-[#FF5733]/20 rounded-lg px-3 py-2">
        ⚠ {tokenErr}
      </div>
    )
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center py-10">
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-[#FF5733] animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden border border-[#2e2520]">
      <SumsubWebSdk
        accessToken={token}
        expirationHandler={fetchToken}
        config={{ lang: "en" }}
        options={{ addViewportTag: false, adaptIframeHeight: true }}
        onMessage={handleMessage}
        onError={handleError}
      />
    </div>
  )
}


// ─── Manual fallback form ─────────────────────────────────────────────────────
function ManualForm({ onSubmitted }: { onSubmitted: () => void }) {
  const [fullName, setFullName]         = useState("")
  const [dob, setDob]                   = useState("")
  const [nationality, setNationality]   = useState("")
  const [idType, setIdType]             = useState("passport")
  const [idFront, setIdFront]           = useState<File | null>(null)
  const [idBack, setIdBack]             = useState<File | null>(null)
  const [selfie, setSelfie]             = useState<File | null>(null)
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!fullName.trim() || !dob || !nationality.trim() || !idFront) {
      setError("Full name, date of birth, nationality, and ID front are required.")
      return
    }

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append("fullName", fullName.trim())
      fd.append("dateOfBirth", dob)
      fd.append("nationality", nationality.trim())
      fd.append("idType", idType)
      fd.append("idFront", idFront)
      if (idBack)  fd.append("idBack", idBack)
      if (selfie)  fd.append("selfie", selfie)

      const res  = await fetch("/api/kyc/submit", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Submission failed")
      onSubmitted()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="As on your ID"
            className="bg-[#1a1410] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2.5 font-mono text-[13px] text-white placeholder:text-[#4a3a2a] transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            className="bg-[#1a1410] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2.5 font-mono text-[13px] text-white transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">Nationality</label>
          <input
            type="text"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="e.g. United States"
            className="bg-[#1a1410] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2.5 font-mono text-[13px] text-white placeholder:text-[#4a3a2a] transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">ID Type</label>
          <select
            value={idType}
            onChange={(e) => setIdType(e.target.value)}
            className="bg-[#1a1410] border border-[#2e2520] focus:border-[#FF5733]/40 outline-none rounded-lg px-3 py-2.5 font-mono text-[13px] text-white transition-colors"
          >
            <option value="passport">Passport</option>
            <option value="national_id">National ID</option>
            <option value="drivers_license">Driver's License</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "ID Front *", state: idFront, set: setIdFront },
          { label: "ID Back",    state: idBack,  set: setIdBack  },
          { label: "Selfie",     state: selfie,  set: setSelfie  },
        ].map(({ label, state, set }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="font-mono text-[10px] text-[#7a6a5a] uppercase tracking-wider">{label}</label>
            <label className="flex flex-col items-center justify-center gap-1.5 h-24 rounded-lg border-2 border-dashed border-[#2e2520] hover:border-[#FF5733]/30 cursor-pointer transition-colors bg-[#0d0a07]">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => set(e.target.files?.[0] ?? null)}
              />
              {state ? (
                <span className="font-mono text-[11px] text-emerald-400 px-2 text-center truncate w-full text-center">
                  ✓ {state.name}
                </span>
              ) : (
                <>
                  <svg className="w-5 h-5 text-[#4a3a2a]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-mono text-[10px] text-[#4a3a2a]">Upload</span>
                </>
              )}
            </label>
          </div>
        ))}
      </div>

      {error && (
        <div className="font-mono text-[11px] text-[#FF5733] bg-[#FF5733]/5 border border-[#FF5733]/20 rounded-lg px-3 py-2">
          ⚠ {error}
        </div>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full py-3 rounded-xl bg-[#2e2520] hover:bg-[#3e3020] border border-[#3e3020] text-white font-mono text-[13px] font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
      >
        {submitting ? "Submitting…" : "Submit for Manual Review"}
      </button>
    </div>
  )
}


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KycPage() {
  const router = useRouter()
  const [kycState, setKycState]     = useState<KycState | null>(null)
  const [loading, setLoading]       = useState(true)
  const [showManual, setShowManual] = useState(false)
  const [widgetError, setWidgetError] = useState<string | null>(null)
  const [submitMsg, setSubmitMsg]   = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.replace("/auth")
    })()
  }, [router])

  const fetchStatus = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/kyc/status")
      if (res.ok) setKycState(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchStatus() }, [fetchStatus])

  // Poll while pending and provider is sumsub (webhook usually resolves in seconds)
  useEffect(() => {
    if (kycState?.kycStatus !== "pending" || kycState.submission?.provider !== "sumsub") return
    const id = window.setInterval(fetchStatus, 5_000)
    return () => window.clearInterval(id)
  }, [kycState, fetchStatus])

  const handleSumsubSubmitted = async (applicantId: string) => {
    setSubmitting(true)
    setWidgetError(null)
    try {
      const res = await fetch("/api/kyc/sumsub", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ applicantId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to record verification")
      setSubmitMsg("✓ Submitted — processing now…")
      await fetchStatus()
    } catch (e: any) {
      setWidgetError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const needsVerification =
    !kycState?.kycStatus || kycState.kycStatus === "none" || kycState.kycStatus === "rejected"

  return (
    <div className="min-h-screen bg-[#0d0a07] flex flex-col">
      <Topbar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex-1 p-6 max-w-2xl mx-auto w-full">

          <div className="mb-6">
            <h1 className="text-xl font-bold text-white font-mono">Identity Verification</h1>
            <p className="font-mono text-[11px] text-[#4a3a2a] mt-0.5">
              Complete KYC to unlock deposits, withdrawals, and trading
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-2 h-2 rounded-full bg-[#FF5733] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">

              {/* Status banner for approved / pending */}
              {kycState && !needsVerification && (
                <div className="bg-[#0e0a08] border border-[#2e2520] rounded-2xl">
                  <StatusBanner state={kycState} />
                </div>
              )}

              {/* Rejection notice */}
              {kycState?.kycStatus === "rejected" && (
                <div className="bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
                  <p className="font-mono text-[10px] text-red-400/60 uppercase tracking-widest mb-1">
                    Previous submission rejected
                  </p>
                  <p className="font-mono text-[12px] text-red-400">
                    Please re-verify your identity below.
                  </p>
                </div>
              )}

              {/* Verification widget */}
              {needsVerification && (
                <div className="bg-[#0e0a08] border border-[#2e2520] rounded-2xl p-6 flex flex-col gap-5">

                  <div className="flex flex-col gap-2">
                    <h2 className="font-mono text-[13px] font-bold text-white">What you'll need</h2>
                    <ul className="flex flex-col gap-1.5">
                      {[
                        "A government-issued photo ID (passport, national ID, or driver's license)",
                        "A selfie or live camera for face matching",
                        "Takes about 2 minutes",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2 font-mono text-[11px] text-[#7a6a5a]">
                          <span className="text-[#FF5733] mt-0.5 shrink-0">→</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="border-t border-[#2e2520]" />

                  {/* Sumsub inline widget */}
                  <SumsubWidget
                    onSubmitted={handleSumsubSubmitted}
                    onError={(msg) => { setWidgetError(msg); setShowManual(true) }}
                  />

                  <p className="font-mono text-[10px] text-[#4a3a2a] text-center">
                    Powered by Sumsub · Encrypted · Your data is never stored on our servers
                  </p>

                  {submitting && (
                    <div className="font-mono text-[11px] text-[#7a6a5a] text-center flex items-center justify-center gap-2">
                      <span className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#FF5733] animate-bounce"
                            style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                      </span>
                      Recording submission…
                    </div>
                  )}

                  {submitMsg && (
                    <div className="font-mono text-[11px] text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2 text-center">
                      {submitMsg}
                    </div>
                  )}

                  {widgetError && (
                    <div className="font-mono text-[11px] text-[#FF5733] bg-[#FF5733]/5 border border-[#FF5733]/20 rounded-lg px-3 py-2">
                      ⚠ {widgetError}
                    </div>
                  )}

                  {/* Manual fallback — collapsed by default */}
                  <div className="border-t border-[#2e2520] pt-4">
                    <button
                      onClick={() => setShowManual((v) => !v)}
                      className="w-full flex items-center justify-between font-mono text-[11px] text-[#7a6a5a] hover:text-white transition-colors cursor-pointer"
                    >
                      <span>Having trouble? Upload documents manually instead</span>
                      <span className="text-[#4a3a2a]">{showManual ? "▲" : "▼"}</span>
                    </button>

                    {showManual && (
                      <ManualForm
                        onSubmitted={() => { setShowManual(false); fetchStatus() }}
                      />
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

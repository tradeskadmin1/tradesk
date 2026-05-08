"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

// ── Types ─────────────────────────────────────────────────────────────────────

type IdType = "passport" | "national_id" | "drivers_license"
type KycStatus = "none" | "pending" | "approved" | "rejected"

interface KycFormData {
  fullName:    string
  dateOfBirth: string
  nationality: string
  idType:      IdType | ""
  idFront:     File | null
  idBack:      File | null
  selfie:      File | null
}

// ── File upload slot ──────────────────────────────────────────────────────────

function FileSlot({
  label,
  hint,
  file,
  required,
  onSelect,
  onClear,
}: {
  label:    string
  hint:     string
  file:     File | null
  required?: boolean
  onSelect: (f: File) => void
  onClear:  () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">{label}</label>
        {required && <span className="text-[#FF5733] text-[10px]">*</span>}
        {!required && <span className="font-mono text-[9px] text-[#4a3a2a] uppercase tracking-wider">(optional)</span>}
      </div>

      {file ? (
        <div className="flex items-center gap-3 bg-[#120d08] border border-emerald-500/30 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
            {file.type.startsWith("image/") ? (
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-mono text-[12px] text-white truncate">{file.name}</div>
            <div className="font-mono text-[10px] text-[#7a6a5a]">{(file.size / 1024).toFixed(0)} KB</div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-[#4a3a2a] hover:text-[#FF5733] transition-colors cursor-pointer text-[18px] leading-none"
          >
            ×
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-2 w-full bg-[#120d08] border border-dashed border-[#2e2520] hover:border-[#FF5733]/40 rounded-xl px-4 py-5 transition-all cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-xl bg-[#1e1a14] border border-[#2e2520] group-hover:border-[#FF5733]/30 flex items-center justify-center transition-all">
            <svg className="w-4 h-4 text-[#7a6a5a]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div className="font-mono text-[11px] text-[#7a6a5a] group-hover:text-white transition-colors">Click to upload</div>
          <div className="font-mono text-[9px] text-[#4a3a2a] uppercase tracking-wider">{hint}</div>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onSelect(f)
          e.target.value = ""
        }}
      />
    </div>
  )
}

// ── Status display ────────────────────────────────────────────────────────────

function StatusCard({
  status,
  submission,
  onResubmit,
}: {
  status:     KycStatus
  submission: Record<string, unknown> | null
  onResubmit: () => void
}) {
  const configs = {
    pending: {
      icon:    "🕐",
      color:   "#f59e0b",
      bg:      "#f59e0b",
      label:   "Under Review",
      message: "Your documents have been submitted and are being reviewed. This typically takes 1–2 business days.",
    },
    approved: {
      icon:    "✓",
      color:   "#22c55e",
      bg:      "#22c55e",
      label:   "Verified",
      message: "Your identity has been verified. You now have full access to all trading features.",
    },
    rejected: {
      icon:    "✗",
      color:   "#FF5733",
      bg:      "#FF5733",
      label:   "Action Required",
      message: "Your submission was rejected. Please re-submit with clearer documents.",
    },
  }

  const cfg = configs[status as keyof typeof configs]

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
        style={{ background: `${cfg.bg}15`, border: `1px solid ${cfg.bg}40`, color: cfg.color }}
      >
        {cfg.icon}
      </div>

      <div>
        <div className="font-mono text-[11px] uppercase tracking-widest mb-1" style={{ color: cfg.color }}>{cfg.label}</div>
        <h2 className="font-mono text-[22px] font-bold text-white mb-2">Identity Verification</h2>
        <p className="font-mono text-[12px] text-[#7a6a5a] leading-relaxed max-w-sm mx-auto">{cfg.message}</p>
      </div>

      {submission && (
        <div className="w-full bg-[#120d08] border border-[#2e2520] rounded-xl overflow-hidden">
          {[
            { label: "Full Name",  value: submission.full_name   as string },
            { label: "Nationality", value: submission.nationality as string },
            { label: "ID Type",    value: (submission.id_type as string)?.replace("_", " ") },
            { label: "Submitted",  value: new Date(submission.submitted_at as string).toLocaleDateString() },
          ].map((row, i, arr) => (
            <div key={row.label} className={`flex justify-between items-center px-5 py-3 font-mono text-[12px] ${i < arr.length - 1 ? "border-b border-[#2e2520]" : ""}`}>
              <span className="text-[#7a6a5a] text-[10px] uppercase tracking-wider">{row.label}</span>
              <span className="text-white capitalize">{row.value ?? "—"}</span>
            </div>
          ))}
        </div>
      )}

      {status === "rejected" && (
        <button
          onClick={onResubmit}
          className="w-full py-3 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer"
        >
          Re-submit Documents →
        </button>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function KycPage() {
  const router = useRouter()

  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState(false)

  const [kycStatus,  setKycStatus]  = useState<KycStatus>("none")
  const [submission, setSubmission] = useState<Record<string, unknown> | null>(null)
  const [showForm,   setShowForm]   = useState(false)

  const [form, setForm] = useState<KycFormData>({
    fullName:    "",
    dateOfBirth: "",
    nationality: "",
    idType:      "",
    idFront:     null,
    idBack:      null,
    selfie:      null,
  })

  // ── Auth guard + status fetch ─────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace("/"); return }

      const res = await fetch("/api/kyc/status")
      if (res.ok) {
        const data = await res.json()
        setKycStatus(data.kycStatus)
        setSubmission(data.submission)
        if (data.kycStatus === "none" || data.kycStatus === "rejected") {
          setShowForm(data.kycStatus === "none")
        }
      }
      setLoading(false)
    }
    init()
  }, [router])

  // ── Form submit ───────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.idFront) { setError("Please upload your ID front"); return }

    setSubmitting(true)
    setError(null)

    const fd = new FormData()
    fd.append("fullName",    form.fullName)
    fd.append("dateOfBirth", form.dateOfBirth)
    fd.append("nationality", form.nationality)
    fd.append("idType",      form.idType)
    fd.append("idFront",     form.idFront)
    if (form.idBack)   fd.append("idBack",  form.idBack)
    if (form.selfie)   fd.append("selfie",  form.selfie)

    try {
      const res  = await fetch("/api/kyc/submit", { method: "POST", body: fd })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? "Submission failed")
        return
      }

      setSuccess(true)
      setKycStatus("pending")
      setShowForm(false)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const set = (field: keyof KycFormData, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const isValid =
    form.fullName.trim() &&
    form.dateOfBirth &&
    form.nationality.trim() &&
    form.idType &&
    form.idFront

  // ── Shared card wrapper ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0a07]">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-2 h-2 rounded-full bg-[#FF5733] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-[#0d0a07]">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div onClick={() => router.push("/dashboard")} className="font-mono text-[18px] font-bold text-white cursor-pointer">
            Trade<span className="text-[#FF5733]">sk</span>
          </div>
          <button
            onClick={() => router.push("/dashboard")}
            className="font-mono text-[11px] text-[#7a6a5a] hover:text-white transition-colors cursor-pointer"
          >
            ← Dashboard
          </button>
        </div>

        {/* Card */}
        <div className="bg-[#1a1410] border border-[#2e2520] rounded-2xl p-6 sm:p-8 shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
          {/* Traffic lights */}
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[#2e2520]">
            <div className="w-2 h-2 rounded-full bg-[#ff5f57]" />
            <div className="w-2 h-2 rounded-full bg-[#febc2e]" />
            <div className="w-2 h-2 rounded-full bg-[#28c840]" />
            <span className="font-mono text-[10px] text-[#4a3a2a] ml-2 tracking-wider">tradesk://kyc</span>
          </div>

          {/* ── Success state ── */}
          {success && (
            <div className="flex flex-col items-center gap-5 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">✓</div>
              <div>
                <h2 className="font-mono text-[22px] font-bold text-white mb-2">Submitted!</h2>
                <p className="font-mono text-[12px] text-[#7a6a5a] leading-relaxed">
                  Your documents are under review.<br />Verification typically takes 1–2 business days.
                </p>
              </div>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full py-3 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer"
              >
                Back to Dashboard →
              </button>
            </div>
          )}

          {/* ── Existing status (not none) ── */}
          {!success && !showForm && (kycStatus === "pending" || kycStatus === "approved" || kycStatus === "rejected") && (
            <StatusCard
              status={kycStatus}
              submission={submission}
              onResubmit={() => { setShowForm(true); setError(null) }}
            />
          )}

          {/* ── KYC form ── */}
          {!success && (showForm || kycStatus === "none") && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div>
                <h2 className="font-mono text-[22px] font-bold text-white mb-1">Identity Verification</h2>
                <p className="text-[#7a6a5a] text-[13px] font-mono">
                  Required for full account access. Documents are stored securely and never shared.
                </p>
              </div>

              {/* Info banner */}
              <div className="bg-[#1e1208] border border-[#FF5733]/10 rounded-xl px-4 py-3 font-mono text-[11px] text-[#7a6a5a]">
                🔒 Documents are encrypted at rest in private storage. Only compliance staff can access them.
              </div>

              {/* Personal info */}
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">
                    Full Legal Name <span className="text-[#FF5733]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="As it appears on your ID"
                    value={form.fullName}
                    onChange={(e) => set("fullName", e.target.value)}
                    required
                    className="w-full bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 font-mono text-[13px] text-white placeholder:text-[#4a3a2a] transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">
                      Date of Birth <span className="text-[#FF5733]">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.dateOfBirth}
                      onChange={(e) => set("dateOfBirth", e.target.value)}
                      max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split("T")[0]}
                      required
                      className="w-full bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 font-mono text-[13px] text-white transition-colors scheme:dark"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">
                      Nationality <span className="text-[#FF5733]">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Nigerian"
                      value={form.nationality}
                      onChange={(e) => set("nationality", e.target.value)}
                      required
                      className="w-full bg-[#120d08] border border-[#2e2520] focus:border-[#FF5733]/50 outline-none rounded-xl px-4 py-3 font-mono text-[13px] text-white placeholder:text-[#4a3a2a] transition-colors"
                    />
                  </div>
                </div>

                {/* ID type */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">
                    Document Type <span className="text-[#FF5733]">*</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "passport",        label: "Passport",   icon: "🛂" },
                      { id: "national_id",     label: "National ID", icon: "🪪" },
                      { id: "drivers_license", label: "Driver's License", icon: "🚗" },
                    ].map((opt) => {
                      const active = form.idType === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => set("idType", opt.id)}
                          className={`flex flex-col items-center gap-1.5 px-3 py-3.5 rounded-xl border font-mono text-[11px] transition-all cursor-pointer ${active ? "border-[#FF5733]/50 bg-[#FF5733]/5 text-white" : "border-[#2e2520] bg-[#120d08] text-[#7a6a5a] hover:border-[#3a2520]"}`}
                        >
                          <span className="text-[20px]">{opt.icon}</span>
                          <span className="text-center leading-tight text-[10px]">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Document uploads */}
              <div className="border-t border-[#2e2520] pt-5 flex flex-col gap-4">
                <div className="font-mono text-[11px] text-[#7a6a5a] uppercase tracking-wider">Document Photos</div>

                <FileSlot
                  label="ID Front"
                  hint="JPG, PNG or PDF · Max 10MB"
                  file={form.idFront}
                  required
                  onSelect={(f) => set("idFront", f)}
                  onClear={() => set("idFront", null)}
                />

                {form.idType !== "passport" && (
                  <FileSlot
                    label="ID Back"
                    hint="Required for national ID and driver's license"
                    file={form.idBack}
                    required
                    onSelect={(f) => set("idBack", f)}
                    onClear={() => set("idBack", null)}
                  />
                )}

                <FileSlot
                  label="Selfie with ID"
                  hint="Hold your ID next to your face · JPG or PNG"
                  file={form.selfie}
                  onSelect={(f) => set("selfie", f)}
                  onClear={() => set("selfie", null)}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="bg-[#FF5733]/5 border border-[#FF5733]/30 rounded-xl px-4 py-3 font-mono text-[12px] text-[#FF5733]">
                  ⚠ {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!isValid || submitting}
                className="w-full py-3.5 rounded-xl font-mono text-[13px] font-bold bg-[#FF5733] hover:bg-[#ff6a4d] text-white transition-all hover:-translate-y-0.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span key={i} className="w-1.5 h-1.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </span>
                    Uploading Documents...
                  </span>
                ) : (
                  "Submit for Review →"
                )}
              </button>

              <p className="font-mono text-[10px] text-[#4a3a2a] text-center leading-relaxed">
                By submitting, you confirm this information is accurate. Falsifying KYC documents may result in permanent account suspension.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM = process.env.EMAIL_FROM ?? 'Tradesk <noreply@tradesk.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ── KYC Approved ─────────────────────────────────────────────────────────────

export async function sendKycApprovedEmail(to: string, fullName: string) {
    const first = fullName?.split(' ')[0] ?? 'there'

    await resend.emails.send({
        from: FROM,
        to,
        subject: '✅ Your identity has been verified — Tradesk',
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0a07;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0a07;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1a1410;border:1px solid #2e2520;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1a1410;padding:28px 32px 20px;border-bottom:1px solid #2e2520;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
              Trade<span style="color:#FF5733;">sk</span>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
              You're verified, ${first} 🎉
            </p>
            <p style="margin:0 0 24px;font-size:13px;color:#7a6a5a;line-height:1.6;">
              Your identity verification has been reviewed and <strong style="color:#34d399;">approved</strong>.
              You now have full access to all Tradesk features including higher withdrawal limits.
            </p>

            <!-- Status badge -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#064e3b;border:1px solid #34d399;border-radius:999px;padding:6px 16px;">
                  <span style="font-size:12px;color:#34d399;font-weight:600;">✓ KYC Approved</span>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#FF5733;border-radius:10px;">
                  <a href="${APP_URL}/dashboard" style="display:inline-block;padding:12px 28px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;">
                    Go to Dashboard →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2e2520;">
            <p style="margin:0;font-size:10px;color:#4a3a2a;line-height:1.5;">
              This email was sent by Tradesk. If you did not create an account, please ignore this message.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
}

// ── KYC Rejected ─────────────────────────────────────────────────────────────

export async function sendKycRejectedEmail(to: string, fullName: string, reason: string) {
    const first = fullName?.split(' ')[0] ?? 'there'

    await resend.emails.send({
        from: FROM,
        to,
        subject: 'Action required: identity verification unsuccessful — Tradesk',
        html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0a07;font-family:'Courier New',monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0a07;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#1a1410;border:1px solid #2e2520;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:#1a1410;padding:28px 32px 20px;border-bottom:1px solid #2e2520;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#ffffff;letter-spacing:0.5px;">
              Trade<span style="color:#FF5733;">sk</span>
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#ffffff;">
              Verification unsuccessful, ${first}
            </p>
            <p style="margin:0 0 20px;font-size:13px;color:#7a6a5a;line-height:1.6;">
              Unfortunately we were unable to verify your identity. You can review the reason below
              and resubmit your documents.
            </p>

            <!-- Reason box -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="background:#2d0f0a;border:1px solid #7f1d1d;border-radius:10px;padding:14px 18px;">
                  <p style="margin:0 0 4px;font-size:10px;color:#f87171;text-transform:uppercase;letter-spacing:1px;">Reason</p>
                  <p style="margin:0;font-size:13px;color:#fca5a5;line-height:1.5;">${reason}</p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#FF5733;border-radius:10px;">
                  <a href="${APP_URL}/kyc" style="display:inline-block;padding:12px 28px;font-size:13px;font-weight:700;color:#ffffff;text-decoration:none;">
                    Resubmit Documents →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #2e2520;">
            <p style="margin:0;font-size:10px;color:#4a3a2a;line-height:1.5;">
              This email was sent by Tradesk. If you did not create an account, please ignore this message.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
    })
}

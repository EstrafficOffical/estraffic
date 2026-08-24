"use client";

import { useEffect, useState } from "react";

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard may be unavailable in some browser contexts.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/80 transition hover:bg-white/[0.08] hover:text-white"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function Code({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-white/85">
      {children}
    </code>
  );
}

export default function PostbacksClient({
  locale: _locale,
}: {
  locale: string;
}) {
  const [endpoint, setEndpoint] = useState(
    "/api/nexus/postback",
  );

  useEffect(() => {
    setEndpoint(
      `${window.location.origin}/api/nexus/postback`,
    );
  }, []);

  const example = `POST ${endpoint}
Content-Type: application/json
X-Nexus-Postback-Secret: <YOUR_SECRET>

{
  "source": "PARTNER_NAME",
  "click_id": "nexus_click_id",
  "tx_id": "partner_transaction_id",
  "event": "deposit",
  "status": "approved",
  "amount": 100,
  "currency": "USD",
  "event_at": "2026-08-22T16:30:00Z"
}`;

  const curlExample = `curl -X POST "${endpoint}" \\
  -H "Content-Type: application/json" \\
  -H "X-Nexus-Postback-Secret: <YOUR_SECRET>" \\
  -d '{
    "source": "PARTNER_NAME",
    "click_id": "nexus_click_id",
    "tx_id": "partner_transaction_id",
    "event": "deposit",
    "status": "approved",
    "amount": 100,
    "currency": "USD"
  }'`;

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <div className="mb-8">
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7657ff]">
          Integrations
        </div>

        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white">
          Postback API
        </h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-white/50">
          Server-to-server conversion ingestion for NEXUS ALLIANCE.
          Use this endpoint to send registrations, deposits, sales,
          rebills and lead events from advertiser or partner systems.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5 lg:col-span-2">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">
            Endpoint
          </div>

          <div className="mt-3 flex gap-2">
            <input
              readOnly
              value={endpoint}
              className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2.5 font-mono text-xs text-white/80 outline-none"
            />
            <CopyButton value={endpoint} />
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/45">
            <span className="rounded-md border border-white/[0.07] px-2 py-1">
              POST recommended
            </span>
            <span className="rounded-md border border-white/[0.07] px-2 py-1">
              JSON / Form
            </span>
            <span className="rounded-md border border-white/[0.07] px-2 py-1">
              GET supported
            </span>
            <span className="rounded-md border border-white/[0.07] px-2 py-1">
              No-store
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
          <div className="text-xs font-medium uppercase tracking-[0.12em] text-white/40">
            Authentication
          </div>

          <div className="mt-4 space-y-3 text-sm text-white/60">
            <div>
              Recommended:
              <div className="mt-1">
                <Code>X-Nexus-Postback-Secret</Code>
              </div>
            </div>

            <div>
              Also supported:
              <div className="mt-1">
                <Code>Authorization: Bearer ...</Code>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.04] p-5">
        <div className="text-sm font-medium text-amber-200">
          Integration secret
        </div>

        <p className="mt-2 text-sm leading-6 text-white/50">
          The postback secret is intentionally not displayed on this
          page. Secret disclosure is a sensitive administrative action
          and must use step-up authentication. Configure integrations
          using the server-side NEXUS postback secret.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
          <h2 className="text-sm font-semibold text-white">
            Required fields
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Code>click_id</Code>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-300/80">
                  Required
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-white/45">
                NEXUS click identifier generated by the tracking
                redirect.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Code>tx_id</Code>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-red-300/80">
                  Required
                </span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-white/45">
                Unique partner transaction identifier.
              </p>
            </div>

            <div>
              <Code>source</Code>
              <p className="mt-1.5 text-xs leading-5 text-white/45">
                Partner or integration identifier. Defaults to GENERIC.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
          <h2 className="text-sm font-semibold text-white">
            Conversion fields
          </h2>

          <div className="mt-4 space-y-3 text-xs leading-5 text-white/50">
            <p>
              <Code>event</Code>{" "}
              registration, deposit, rebill, sale or lead.
            </p>

            <p>
              <Code>status</Code>{" "}
              approved, pending, rejected or reversed.
            </p>

            <p>
              <Code>amount</Code>{" "}
              advertiser payout or revenue value.
            </p>

            <p>
              <Code>currency</Code>{" "}
              ISO currency code. Defaults to the click snapshot or USD.
            </p>

            <p>
              <Code>event_at</Code>{" "}
              ISO date/time or Unix timestamp.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
        <h2 className="text-sm font-semibold text-white">
          Idempotency
        </h2>

        <p className="mt-2 text-sm leading-6 text-white/50">
          Conversions are deduplicated by{" "}
          <Code>source + tx_id</Code>. Replaying the same transaction
          updates the existing conversion instead of creating a
          duplicate. A transaction reused with another click ID is
          rejected as a conflict.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-white">
            JSON example
          </h2>

          <CopyButton value={example} />
        </div>

        <pre className="mt-4 overflow-x-auto rounded-lg border border-white/[0.07] bg-black/25 p-4 font-mono text-xs leading-6 text-white/65">
          {example}
        </pre>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold text-white">
            cURL example
          </h2>

          <CopyButton value={curlExample} />
        </div>

        <pre className="mt-4 overflow-x-auto rounded-lg border border-white/[0.07] bg-black/25 p-4 font-mono text-xs leading-6 text-white/65">
          {curlExample}
        </pre>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.025] p-5">
        <h2 className="text-sm font-semibold text-white">
          Processing behavior
        </h2>

        <div className="mt-3 space-y-2 text-sm leading-6 text-white/50">
          <p>
            Approved deposit events use the CPA economics frozen on the
            original NEXUS click.
          </p>

          <p>
            Flow cap is checked before an approved deposit is credited.
            Events above the cap receive zero affiliate and advertiser
            payout.
          </p>

          <p>
            Pending, rejected and reversed events do not create an
            affiliate payout.
          </p>

          <p>
            Eligible approved deposits create an earning and finance
            ledger entry automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
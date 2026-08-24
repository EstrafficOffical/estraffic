"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import {
  usePathname,
  useRouter,
} from "next/navigation";

type PartnerForm = {
  id?: string;
  name: string;
  status: "ACTIVE" | "PAUSED";
  vertical: string;
  contactName: string;
  contactEmail: string;
  contactTelegram: string;
  paymentTerms: string;
  settlementCurrency: string;
  integrationType: string;
  internalNotes: string;
};

type Props =
  | {
      mode: "create";
      compact?: boolean;
      partner?: never;
    }
  | {
      mode: "edit";
      compact?: boolean;
      partner: PartnerForm & {
        id: string;
      };
    };

const emptyForm: PartnerForm = {
  name: "",
  status: "ACTIVE",
  vertical: "",
  contactName: "",
  contactEmail: "",
  contactTelegram: "",
  paymentTerms: "",
  settlementCurrency: "USD",
  integrationType: "",
  internalNotes: "",
};

function errorLabel(code: string) {
  if (code === "PARTNER_NAME_REQUIRED") {
    return "Partner name is required.";
  }

  if (code === "PARTNER_NAME_EXISTS") {
    return "A partner with this name already exists.";
  }

  if (code === "PARTNER_NOT_FOUND") {
    return "This partner no longer exists.";
  }

  return "Partner action failed. Please try again.";
}

export default function PartnerEditor(
  props: Props,
) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] =
    useState(false);
  const [error, setError] =
    useState("");
  const [form, setForm] =
    useState<PartnerForm>(
      props.mode === "edit"
        ? props.partner
        : emptyForm,
    );

  useEffect(() => {
    if (!open) return;

    setError("");

    setForm(
      props.mode === "edit"
        ? props.partner
        : emptyForm,
    );
  }, [open, props]);

  function field(
    name: keyof PartnerForm,
  ) {
    return (
      event: React.ChangeEvent<
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
      >,
    ) => {
      setForm((current) => ({
        ...current,
        [name]: event.target.value,
      }));
    };
  }

  function goToStepUp() {
    const locale =
      pathname.split("/")[1] || "en";

    window.location.assign(
      `/${locale}/security/step-up?callbackUrl=${encodeURIComponent(
        pathname,
      )}`,
    );
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const endpoint =
        props.mode === "create"
          ? "/api/admin/partners"
          : `/api/admin/partners/${props.partner.id}`;

      const response = await fetch(
        endpoint,
        {
          method:
            props.mode === "create"
              ? "POST"
              : "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        },
      );

      const body = await response
        .json()
        .catch(() => ({}));

      if (
        response.status === 428 &&
        body?.error ===
          "STEP_UP_REQUIRED"
      ) {
        goToStepUp();
        return;
      }

      if (!response.ok || !body?.ok) {
        setError(
          errorLabel(
            String(
              body?.error || "",
            ),
          ),
        );
        return;
      }

      setOpen(false);
      router.refresh();
    } catch {
      setError(
        "Partner action failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          props.compact
            ? "rounded-lg border border-white/[0.09] bg-white/[0.025] px-3 py-2 text-[10px] font-semibold text-white/52 transition hover:bg-white/[0.05] hover:text-white"
            : "rounded-xl bg-[#7657ff] px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-[#846cff]"
        }
      >
        {props.mode === "create"
          ? "Add partner"
          : "Edit partner"}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-[820px] overflow-y-auto rounded-3xl border border-white/[0.10] bg-[#0d0f14] shadow-[0_40px_140px_rgba(0,0,0,.65)]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[0.07] bg-[#0d0f14]/95 px-6 py-5 backdrop-blur-xl">
              <div>
                <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-[#8068ff]">
                  Internal CRM
                </div>

                <h2 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
                  {props.mode ===
                  "create"
                    ? "Add partner"
                    : "Edit partner"}
                </h2>

                <p className="mt-1 text-xs text-white/35">
                  Advertiser contacts and
                  commercial terms are
                  internal-only.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="grid h-9 w-9 place-items-center rounded-lg border border-white/[0.08] text-lg text-white/35 transition hover:bg-white/[0.04] hover:text-white"
                aria-label="Close"
              >
                Г—
              </button>
            </div>

            <form
              onSubmit={submit}
              className="space-y-5 p-6"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Partner name"
                  required
                >
                  <input
                    value={form.name}
                    onChange={field("name")}
                    required
                    maxLength={191}
                    placeholder="FAVBET"
                    className={inputClass}
                  />
                </Field>

                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={field(
                      "status",
                    )}
                    className={inputClass}
                  >
                    <option value="ACTIVE">
                      Active
                    </option>
                    <option value="PAUSED">
                      Paused
                    </option>
                  </select>
                </Field>

                <Field label="Vertical">
                  <input
                    value={form.vertical}
                    onChange={field(
                      "vertical",
                    )}
                    placeholder="iGaming"
                    maxLength={191}
                    className={inputClass}
                  />
                </Field>

                <Field label="Settlement currency">
                  <input
                    value={
                      form.settlementCurrency
                    }
                    onChange={field(
                      "settlementCurrency",
                    )}
                    placeholder="USD"
                    maxLength={12}
                    className={inputClass}
                  />
                </Field>
              </div>

              <section className={sectionClass}>
                <SectionTitle>
                  Contact
                </SectionTitle>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <Field label="Contact name">
                    <input
                      value={
                        form.contactName
                      }
                      onChange={field(
                        "contactName",
                      )}
                      placeholder="Account manager"
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Telegram">
                    <input
                      value={
                        form.contactTelegram
                      }
                      onChange={field(
                        "contactTelegram",
                      )}
                      placeholder="@manager"
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Email">
                    <input
                      value={
                        form.contactEmail
                      }
                      onChange={field(
                        "contactEmail",
                      )}
                      placeholder="manager@partner.com"
                      type="email"
                      className={
                        inputClass
                      }
                    />
                  </Field>
                </div>
              </section>

              <section className={sectionClass}>
                <SectionTitle>
                  Commercial & integration
                </SectionTitle>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Payment terms">
                    <input
                      value={
                        form.paymentTerms
                      }
                      onChange={field(
                        "paymentTerms",
                      )}
                      placeholder="Net 15"
                      className={
                        inputClass
                      }
                    />
                  </Field>

                  <Field label="Integration type">
                    <input
                      value={
                        form.integrationType
                      }
                      onChange={field(
                        "integrationType",
                      )}
                      placeholder="Postback / API"
                      maxLength={64}
                      className={
                        inputClass
                      }
                    />
                  </Field>
                </div>
              </section>

              <section className={sectionClass}>
                <SectionTitle>
                  Internal notes
                </SectionTitle>

                <textarea
                  value={form.internalNotes}
                  onChange={field(
                    "internalNotes",
                  )}
                  rows={5}
                  maxLength={10000}
                  placeholder="Agreement history, payment notes, restrictions, important context..."
                  className={`${inputClass} mt-4 min-h-[120px] resize-y py-3`}
                />
              </section>

              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/[0.07] px-4 py-3 text-xs text-red-200/85">
                  {error}
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-2 border-t border-white/[0.07] pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  disabled={busy}
                  className="rounded-xl border border-white/[0.09] px-4 py-2.5 text-xs font-semibold text-white/50 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#7657ff] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#846cff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy
                    ? "Saving..."
                    : props.mode ===
                        "create"
                      ? "Create partner"
                      : "Save changes"}
                </button>
              </div>

              <div className="text-right text-[9px] uppercase tracking-[0.12em] text-white/20">
                Recent 2FA required
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-white/[0.08] bg-black/20 px-3.5 text-xs text-white outline-none transition placeholder:text-white/22 focus:border-[#7657ff]/45";

const sectionClass =
  "rounded-2xl border border-white/[0.07] bg-black/10 p-4";

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-[10px] font-medium text-white/38">
        {label}
        {required ? (
          <span className="ml-1 text-[#8f7aff]">
            *
          </span>
        ) : null}
      </span>

      {children}
    </label>
  );
}

function SectionTitle({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-white/30">
      {children}
    </div>
  );
}
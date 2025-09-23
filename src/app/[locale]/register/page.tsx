"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage({ params }: { params: { locale: string } }) {
  const locale = params.locale;
  const router = useRouter();

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen px-4 py-10 text-white/90">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-6 flex items-center justify-center gap-3">
            <a
              href={`/${locale}/login`}
              className="rounded-xl border border-white/30 bg-white/5 px-6 py-3 text-sm font-semibold tracking-wide text-white/70 shadow-[0_0_24px_rgba(255,255,255,.12)] hover:bg-white/10"
            >
              ВОЙТИ
            </a>
            <a
              href={`/${locale}/register`}
              className="rounded-xl border border-white/25 bg-white/10 px-6 py-3 text-sm font-semibold tracking-wide text-white/80 backdrop-blur hover:bg-white/15"
            >
              РЕГИСТРАЦИЯ
            </a>
          </div>
          <div className="rounded-2xl border border-white/12 bg-white/5 p-6 shadow-[0_8px_40px_rgba(0,0,0,.45)]">
            {children}
          </div>
        </div>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-white/90 outline-none placeholder:text-white/40 focus:border-white/40 focus:shadow-[0_0_0_3px_rgba(255,255,255,.12)]";
  const selectCls =
    "w-full rounded-xl border border-white/20 bg-zinc-800/90 text-white/90 px-3 py-2 outline-none focus:border-white/40";

  const countries = [
    "Afghanistan","Albania","Algeria","Andorra","Angola","Antigua and Barbuda","Argentina","Armenia","Australia","Austria","Azerbaijan",
    "Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium","Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei","Bulgaria","Burkina Faso","Burundi",
    "Cabo Verde","Cambodia","Cameroon","Canada","Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo (Congo-Brazzaville)","Costa Rica","Côte d’Ivoire","Croatia","Cuba","Cyprus","Czechia",
    "Democratic Republic of the Congo","Denmark","Djibouti","Dominica","Dominican Republic",
    "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
    "Fiji","Finland","France",
    "Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada","Guatemala","Guinea","Guinea-Bissau","Guyana",
    "Haiti","Honduras","Hungary",
    "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy",
    "Jamaica","Japan","Jordan",
    "Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan",
    "Laos","Latvia","Lebanon","Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg",
    "Madagascar","Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius","Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique","Myanmar",
    "Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria","North Korea","North Macedonia","Norway",
    "Oman",
    "Pakistan","Palau","Panama","Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal",
    "Qatar",
    "Romania","Russia","Rwanda",
    "Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines","Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles","Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa","South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland","Syria",
    "Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga","Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu",
    "Uganda","Ukraine","United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan",
    "Vanuatu","Vatican City","Venezuela","Vietnam",
    "Yemen",
    "Zambia","Zimbabwe",
  ];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const email = String(fd.get("email") || "");
    const telegram = String(fd.get("telegram") || "");
    const country = String(fd.get("country") || "");
    const heardFrom = String(fd.get("heardFrom") || "");
    const password = String(fd.get("password") || "");
    const confirm = String(fd.get("confirm") || "");
    const robot = fd.get("robot") === "on";
    const agree = fd.get("agree") === "on";

    const errEl = e.currentTarget.querySelector("#form-error") as HTMLParagraphElement | null;

    if (!robot) return errEl && (errEl.textContent = "Подтвердите, что вы не робот");
    if (!agree) return errEl && (errEl.textContent = "Подтвердите согласие с договором");
    if (password !== confirm) return errEl && (errEl.textContent = "Пароли не совпадают");
    if (!country) return errEl && (errEl.textContent = "Выберите страну");

    errEl && (errEl.textContent = "");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirm, telegram, country, heardFrom }),
    });

    const data = await res.json().catch(() => ({} as any));

    if (res.status === 201 && data?.ok) {
      await signIn("credentials", { email, password, redirect: true, callbackUrl: `/${locale}` });
      return;
    }

    if (res.status === 409) errEl && (errEl.textContent = "Email уже занят");
    else errEl && (errEl.textContent = data?.error || "Ошибка регистрации");
  }

  return (
    <Shell>
      <h1 className="mb-4 text-2xl font-extrabold">Регистрация</h1>
      <form onSubmit={onSubmit} className="grid gap-4">
        <label className="block">
          <div className="mb-1 text-sm text-white/70">Эл. почта*</div>
          <input name="email" type="email" autoComplete="email" className={inputCls} placeholder="you@email.com" required />
        </label>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1 text-sm text-white/70">Telegram*</div>
            <input name="telegram" className={inputCls} placeholder="username (без @)" required />
          </label>

          <label className="block">
            <div className="mb-1 text-sm text-white/70">Выберите страну*</div>
            <select name="country" className={selectCls} defaultValue="" required aria-label="Страна">
              <option value="">Выберите страну…</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block">
          <div className="mb-1 text-sm text-white/70">Откуда вы о нас узнали?</div>
          <input name="heardFrom" className={inputCls} placeholder="Например: Telegram, друзья, YouTube…" />
        </label>

        <label className="block">
          <div className="mb-1 text-sm text-white/70">Пароль*</div>
          <input name="password" type="password" autoComplete="new-password" className={inputCls} placeholder="Минимум 8 символов" required />
        </label>

        <label className="block">
          <div className="mb-1 text-sm text-white/70">Повторите пароль*</div>
          <input name="confirm" type="password" autoComplete="new-password" className={inputCls} required />
        </label>

        <label className="mt-2 flex items-center gap-3">
          <input type="checkbox" name="robot" className="h-4 w-4 rounded border-white/30 bg-white/5 text-white" />
          <span className="text-sm text-white/80">I’m not a robot</span>
        </label>

        <label className="flex items-center gap-3">
          <input type="checkbox" name="agree" className="h-4 w-4 rounded border-white/30 bg-white/5 text-white" />
          <span className="text-sm text-white/80">
            Я согласен с{" "}
            <a href="#" className="underline decoration-white/30 underline-offset-4 hover:text-white">
              Договором оферты
            </a>
          </span>
        </label>

        <p id="form-error" className="text-sm text-white/70" />

        <button
          type="submit"
          className="w-full rounded-xl border border-white/25 bg-white/10 px-5 py-3 font-semibold tracking-wide text-white/90 transition hover:bg-white/15 focus:shadow-[0_0_0_4px_rgba(255,255,255,.14)]"
        >
          Регистрация
        </button>

        <div className="pt-2 text-center text-sm text-white/60">
          Уже есть аккаунт?{" "}
          <a href={`/${locale}/login`} className="underline decoration-white/30 underline-offset-4 hover:text-white">
            Войти
          </a>
        </div>
      </form>
    </Shell>
  );
}

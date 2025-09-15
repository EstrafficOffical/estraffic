"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { TextInput, Button } from "@/app/components/Form";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.ok) router.push("/");
    else setErr("Invalid email or password");
  }

  return (
    <div className="mx-auto max-w-md bg-white p-6 rounded-xl shadow">
      <h1 className="text-xl font-semibold mb-4">Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="block text-sm mb-1">Email</label>
          <TextInput type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm mb-1">Password</label>
          <TextInput type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
        </div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <Button type="submit">Log in</Button>
      </form>
    </div>
  );
}

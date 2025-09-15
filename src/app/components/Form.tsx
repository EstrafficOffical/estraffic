"use client";
import { useState } from "react";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={"w-full rounded border px-3 py-2 outline-none focus:ring " + (props.className ?? "")}
    />
  );
}

export function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={"rounded px-4 py-2 border bg-black text-white disabled:opacity-50 " + (props.className ?? "")}
    />
  );
}

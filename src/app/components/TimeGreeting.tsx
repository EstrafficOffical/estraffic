"use client";

import { useEffect, useState } from "react";

type Props = {
  firstName: string;
};

function greetingForHour(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function TimeGreeting({ firstName }: Props) {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <h1 className="mt-2 text-3xl font-semibold tracking-[-0.025em] text-white md:text-[38px]">
      {greeting}, {firstName}.
    </h1>
  );
}
import "server-only";

import { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ManagerAssignment from "./ManagerAssignment";
import TierAssignment from "./TierAssignment";
import StaffAccessActions from "./StaffAccessActions";

export const dynamic = "force-dynamic";

type SearchParams = {
  q?: string;
  status?: string;
};

const VALID_STATUSES = new Set([
  "APPROVED",
  "PENDING",
  "SUSPENDED",
  "BANNED",
]);

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const query = await searchParams;

  const session = await auth();
  const role = String(
    (session?.user as any)?.role || "",
  );

  if (
    !session?.user ||
    !["OWNER", "ADMIN"].includes(role)
  ) {
    redirect(`/${locale}`);
  }

  const q = String(query?.q || "").trim();
  const requestedStatus = String(
    query?.status || "ALL",
  ).toUpperCase();

  const status = VALID_STATUSES.has(requestedStatus)
    ? requestedStatus
    : "ALL";

  const where: Prisma.UserWhereInput = {
    role: "USER",
    ...(status === "ALL"
      ? {}
      : {
          status: status as any,
        }),
    ...(q
      ? {
          OR: [
            {
              name: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              telegram: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };

  const [users, managers] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        telegram: true,
        tier: true,
        status: true,
        createdAt: true,
        assignedManagerId: true,
        assignedManager: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        application: {
          select: {
            mainGeos: true,
            trafficSources: true,
          },
        },
        _count: {
          select: {
            offerAccesses: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),

    prisma.user.findMany({
      where: {
        role: {
          in: ["MANAGER", "ADMIN", "OWNER"],
        },
        status: "APPROVED",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [
        {
          role: "asc",
        },
        {
          name: "asc",
        },
        {
          email: "asc",
        },
      ],
    }),
  ]);

  const managerOptions = managers.map(
    (manager) => ({
      id: manager.id,
      name: manager.name,
      email: manager.email,
      role: manager.role as
        | "MANAGER"
        | "ADMIN"
        | "OWNER",
    }),
  );

  return (
    <div className="px-5 py-7 md:px-8 md:py-9">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8068ff]">
            Administration
          </div>

          <h1 className="mt-2 text-4xl font-semibold tracking-[-0.045em]">
            Users
          </h1>

          <p className="mt-2 text-sm text-white/45">
            Affiliate accounts, manager assignment and
            access controls backed by PostgreSQL.
          </p>
        </div>

        <form className="mb-4 flex gap-2 rounded-xl border border-white/[0.08] bg-[#0d0d10] p-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search name, email, Telegram..."
            className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-[#111115] px-3 py-2 text-sm outline-none focus:border-[#7657ff]/40"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-white/[0.08] bg-[#111115] px-3 py-2 text-sm"
          >
            <option value="ALL">All statuses</option>
            <option value="APPROVED">
              Approved
            </option>
            <option value="PENDING">Pending</option>
            <option value="SUSPENDED">
              Suspended
            </option>
            <option value="BANNED">Banned</option>
          </select>

          <button className="rounded-lg bg-[#7657ff] px-4 py-2 text-sm font-semibold">
            Filter
          </button>
        </form>

        <div className="mb-4 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-xs leading-5 text-white/40">
          Assigned managers can be changed at any time.
          Manager changes require a recent security
          verification and are recorded in the security
          audit trail.
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0d0d10]">
          <table className="min-w-[1250px] w-full text-left text-sm">
            <thead className="border-b border-white/[0.07] text-[10px] uppercase tracking-[0.13em] text-white/35">
              <tr>
                <th className="px-4 py-3">
                  Affiliate
                </th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3">
                  Manager
                </th>
                <th className="px-4 py-3">
                  Traffic
                </th>
                <th className="px-4 py-3">
                  Flows
                </th>
                <th className="px-4 py-3">
                  Registered
                </th>
                <th className="px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.06]">
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="text-white/70"
                >
                  <td className="px-4 py-4">
                    <div className="font-medium text-white/90">
                      {user.name ||
                        "Unnamed affiliate"}
                    </div>
                    <div className="mt-1 text-xs text-white/35">
                      {user.email}
                      {user.telegram
                        ? ` В· ${user.telegram}`
                        : ""}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <TierAssignment
                      userId={user.id}
                      currentTier={user.tier}
                    />
                  </td>

                  <td className="px-4 py-4">
                    <Status value={user.status} />
                  </td>

                  <td className="px-4 py-4">
                    <ManagerAssignment
                      userId={user.id}
                      currentManagerId={
                        user.assignedManagerId
                      }
                      managers={managerOptions}
                    />
                    {user.assignedManager ? (
                      <div className="mt-1 text-[10px] text-white/28">
                        Current:{" "}
                        {user.assignedManager.name ||
                          user.assignedManager.email}
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4 text-xs text-white/45">
                    {[
                      ...(user.application
                        ?.trafficSources || []),
                      ...(user.application
                        ?.mainGeos || []),
                    ]
                      .slice(0, 4)
                      .join(" В· ") || "вЂ”"}
                  </td>

                  <td className="px-4 py-4">
                    {user._count.offerAccesses}
                  </td>

                  <td className="px-4 py-4 text-xs text-white/45">
                    {user.createdAt.toLocaleDateString(
                      "en-GB",
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex min-w-[150px] flex-col gap-2">
                      <Link
                        href={`/${locale}/affiliate-preview/${user.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-lg border border-[#7657ff]/25 bg-[#7657ff]/[0.07] px-3 text-xs font-semibold text-[#a694ff] transition hover:bg-[#7657ff]/12"
                      >
                        View as Affiliate
                      </Link>

                      <StaffAccessActions
                        userId={user.id}
                        status={user.status}
                        canPromote={role === "OWNER"}
                      />
                    </div>
                  </td>
                </tr>
              ))}

              {!users.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-6 py-14 text-center text-white/35"
                  >
                    No affiliates found
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Status({
  value,
}: {
  value: string;
}) {
  const cls =
    value === "APPROVED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : value === "PENDING"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : "border-rose-400/20 bg-rose-400/10 text-rose-300";

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${cls}`}
    >
      {value}
    </span>
  );
}
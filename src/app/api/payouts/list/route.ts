export async function GET() {
  return Response.json([
    { id: "p1", date: "2025-04-03", amount: 1000, status: "Paid",    txHash: "e3c2fa6…" },
    { id: "p2", date: "2025-03-26", amount: 500,  status: "Pending", txHash: null },
    { id: "p3", date: "2025-03-18", amount: 1200, status: "Paid",    txHash: "9a81b1…" },
  ]);
}

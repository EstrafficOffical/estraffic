export async function GET() {
  return Response.json([
    { id: "w1", label: "TRC20", address: "TQnEjJgdxyz…", verified: true,  isPrimary: true  },
    { id: "w2", label: "ERC20", address: "0xFLSnqRFc1Z…", verified: true,  isPrimary: false },
    { id: "w3", label: "BTC",   address: "bc1qar0srr7x…", verified: false, isPrimary: false },
  ]);
}

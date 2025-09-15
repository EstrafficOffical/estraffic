export async function GET() {
  return Response.json({
    available: 1250,
    pending: 300,
    totalPaid: 5200,
  });
}

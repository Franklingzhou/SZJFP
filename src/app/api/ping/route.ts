export async function GET() {
  return Response.json({ ok: true, time: Date.now() });
}
export async function POST() {
  return Response.json({ ok: true, method: 'POST' });
}

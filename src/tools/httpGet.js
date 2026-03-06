export async function httpGet({ url }) {
  const res = await fetch(url, { method: 'GET' });
  const text = await res.text();
  return { status: res.status, length: text.length };
}

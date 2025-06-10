const API_BASE = "/aops";

export async function submitAOP(aopData) {
  const res = await fetch(`${API_BASE}/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(aopData),
  });
  return res.json();
}

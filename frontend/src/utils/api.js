const API_BASE = "http://localhost:5001";

export async function submitAOP(aopData) {
  const res = await fetch(`${API_BASE}/aops/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(aopData),
  });
  return res.json();
}

export async function getAuthInfo() {
  const res = await fetch("/.auth/me");
  const data = await res.json();
  return data;
}

export async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `GET ${url} failed`);
  }
  return res.json();
}

export async function apiPost(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `POST ${url} failed`);
  }
  return res.json();
}

export async function apiPatch(url, body) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `PATCH ${url} failed`);
  }
  return res.json();
}

export async function apiDelete(url) {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `DELETE ${url} failed`);
  }
  return res.json();
}

/** Ban (active: false) or reinstate (active: true) a user. Throws with a readable message on failure. */
export async function setUserActive(id: string, active: boolean) {
  const res = await fetch('/api/admin/users/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, active }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new Error(data?.error || 'Failed to update user status')
  }
}

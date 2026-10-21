const API_BASE = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

if (import.meta.env.PROD && !import.meta.env.VITE_API_BASE_URL) {
  // Without this the contact and visit-booking forms post to localhost and fail.
  console.error('VITE_API_BASE_URL is not set: website forms cannot reach the API.');
}

export async function fetchPlans() {
  const res = await fetch(`${API_BASE}/plans`);
  if (!res.ok) throw new Error('Failed to fetch membership plans');
  const data = await res.json();
  return data.data;
}

export async function fetchClasses() {
  const res = await fetch(`${API_BASE}/classes`);
  if (!res.ok) throw new Error('Failed to fetch class timetable');
  const data = await res.json();
  return data.data;
}

export async function fetchTrainers() {
  const res = await fetch(`${API_BASE}/trainers`);
  if (!res.ok) throw new Error('Failed to fetch trainers');
  const data = await res.json();
  return data.data;
}

export async function submitLead(formData: { name: string; phone: string; email?: string; notes?: string; website_honeypot?: string }) {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to submit enquiry');
  return data;
}

export async function bookFreeTrial(formData: { name: string; phone: string; preferred_date: string; preferred_slot: string; website_honeypot?: string }) {
  const res = await fetch(`${API_BASE}/trial-bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Failed to book free trial');
  return data;
}

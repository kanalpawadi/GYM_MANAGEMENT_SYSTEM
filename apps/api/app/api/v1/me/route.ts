import { NextResponse } from 'next/server';

const mockMemberProfile = {
  id: 'demo-member-id',
  full_name: 'Rahul Sharma',
  email: 'member@rvfitnessgym.in',
  phone: '9876543210',
  role: 'member',
  avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
  emergency_contact: { name: 'Sunita Sharma', phone: '9876500000', relation: 'Mother' },
  health_notes: 'Mild lower back sensitivity.',
};

export async function GET() {
  return NextResponse.json({ success: true, data: mockMemberProfile });
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const updated = { ...mockMemberProfile, ...body };
    return NextResponse.json({ success: true, message: 'Profile updated successfully', data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: { code: 'SERVER_ERROR', message: err.message } }, { status: 500 });
  }
}

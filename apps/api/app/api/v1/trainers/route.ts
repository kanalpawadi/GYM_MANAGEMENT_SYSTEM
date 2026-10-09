import { NextResponse } from 'next/server';

const mockTrainers = [
  {
    id: 't1',
    name: 'Vikram Sharma',
    specialization: 'CrossFit & Heavy Strength Conditioning',
    experience_years: 8,
    rating: 4.9,
    bio: 'Former national powerlifter & certified Level-3 CrossFit coach. Specialized in explosive strength and injury prevention.',
    photo_url: 'https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=600&q=80',
    is_active: true,
  },
  {
    id: 't2',
    name: 'Priya Patel',
    specialization: 'Ashtanga Yoga & Pilates',
    experience_years: 6,
    rating: 5.0,
    bio: 'Registered 500-hr RYT yoga master. Passionate about posture correction, flexibility, and stress release.',
    photo_url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80',
    is_active: true,
  },
  {
    id: 't3',
    name: 'Rahul Verma',
    specialization: 'Bodybuilding & Personal Transformation',
    experience_years: 10,
    rating: 4.8,
    bio: 'State level bodybuilding champion and contest preparation expert. Has coached over 400+ successful transformations.',
    photo_url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80',
    is_active: true,
  },
  {
    id: 't4',
    name: 'Ananya Rao',
    specialization: 'Zumba Fitness & Functional Endurance',
    experience_years: 5,
    rating: 4.9,
    bio: 'Licensed Zumba Instructor (ZIN). High energy cardio specialist making workout sessions fun, musical, and fat-burning.',
    photo_url: 'https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=600&q=80',
    is_active: true,
  },
];

export async function GET() {
  return NextResponse.json({ success: true, data: mockTrainers });
}

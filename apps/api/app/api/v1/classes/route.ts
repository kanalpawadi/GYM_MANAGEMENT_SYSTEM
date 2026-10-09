import { NextResponse } from 'next/server';

const mockClasses = [
  { id: '1', title: 'Power Yoga & Mindful Breathing', category: 'Yoga', day_of_week: 'Monday', start_time: '06:30 AM', end_time: '07:30 AM', trainer_name: 'Priya Patel', max_capacity: 20, room: 'Studio A' },
  { id: '2', title: 'CrossFit Shred & Conditioning', category: 'CrossFit', day_of_week: 'Monday', start_time: '07:30 AM', end_time: '08:30 AM', trainer_name: 'Vikram Sharma', max_capacity: 15, room: 'CrossFit Zone' },
  { id: '3', title: 'High-Energy Cardio Zumba Party', category: 'Zumba', day_of_week: 'Tuesday', start_time: '06:00 PM', end_time: '07:00 PM', trainer_name: 'Ananya Rao', max_capacity: 25, room: 'Main Dance Studio' },
  { id: '4', title: 'Heavy Compound Strength & Hypertrophy', category: 'Strength', day_of_week: 'Wednesday', start_time: '07:00 AM', end_time: '08:00 AM', trainer_name: 'Rahul Verma', max_capacity: 12, room: 'Weight Room' },
  { id: '5', title: 'Tabata HIIT Fat Burner', category: 'HIIT', day_of_week: 'Thursday', start_time: '06:30 PM', end_time: '07:30 PM', trainer_name: 'Vikram Sharma', max_capacity: 20, room: 'Studio B' },
  { id: '6', title: 'Weekend Core & Flexibility Workout', category: 'Yoga', day_of_week: 'Saturday', start_time: '08:00 AM', end_time: '09:00 AM', trainer_name: 'Priya Patel', max_capacity: 25, room: 'Studio A' },
];

export async function GET() {
  return NextResponse.json({ success: true, data: mockClasses });
}

import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { BookOpen, Clock, User, CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export const ClassBooking: React.FC = () => {
  const [bookedClassIds, setBookedClassIds] = useState<string[]>(['c2']);

  const classes = [
    { id: 'c1', title: 'Power Yoga & Breathwork', category: 'Yoga', day: 'Today', time: '06:30 PM - 07:30 PM', trainer: 'Priya Patel', room: 'Studio A', capacity: 20, bookedCount: 14 },
    { id: 'c2', title: 'CrossFit Shred & HIIT', category: 'CrossFit', day: 'Tomorrow', time: '07:30 AM - 08:30 AM', trainer: 'Vikram Sharma', room: 'CrossFit Arena', capacity: 15, bookedCount: 15 },
    { id: 'c3', title: 'High-Energy Zumba Dance Party', category: 'Zumba', day: 'Tomorrow', time: '06:00 PM - 07:00 PM', trainer: 'Ananya Rao', room: 'Dance Studio B', capacity: 25, bookedCount: 18 },
    { id: 'c4', title: 'Heavy Barbell Hypertrophy', category: 'Strength', day: 'Thu', time: '07:00 AM - 08:00 AM', trainer: 'Rahul Verma', room: 'Weight Room', capacity: 12, bookedCount: 6 },
  ];

  const handleToggleBooking = (id: string) => {
    if (bookedClassIds.includes(id)) {
      setBookedClassIds(bookedClassIds.filter((item) => item !== id));
    } else {
      setBookedClassIds([...bookedClassIds, id]);
    }
  };

  return (
    <>
      <Helmet>
        <title>Class & PT Bookings | RV-Fitness Gym</title>
      </Helmet>

      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">GROUP FITNESS SLOTS</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            CLASS <span className="text-gym-primary">RESERVATIONS</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {classes.map((cls) => {
            const isBooked = bookedClassIds.includes(cls.id);
            const isFull = cls.bookedCount >= cls.capacity;

            return (
              <Card key={cls.id} className={`flex flex-col justify-between ${isBooked ? 'border-gym-primary bg-gym-primary/10' : ''}`}>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Badge variant="primary">{cls.category}</Badge>
                    <span className="text-xs text-gym-muted flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gym-primary" /> {cls.time} ({cls.day})
                    </span>
                  </div>

                  <h3 className="text-2xl font-heading text-white uppercase mt-2">{cls.title}</h3>

                  <div className="space-y-1 text-xs text-gym-muted my-3">
                    <p>Instructor: <strong className="text-white">{cls.trainer}</strong></p>
                    <p>Studio Room: <strong className="text-white">{cls.room}</strong></p>
                    <p>Capacity: <strong className={isFull ? 'text-gym-danger' : 'text-gym-success'}>{cls.bookedCount} / {cls.capacity} Reserved</strong></p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gym-border">
                  {isBooked ? (
                    <Button
                      variant="danger"
                      size="sm"
                      className="w-full"
                      onClick={() => handleToggleBooking(cls.id)}
                      leftIcon={<XCircle className="w-4 h-4" />}
                    >
                      Cancel Booking
                    </Button>
                  ) : (
                    <Button
                      variant={isFull ? 'secondary' : 'primary'}
                      size="sm"
                      className="w-full"
                      onClick={() => handleToggleBooking(cls.id)}
                      leftIcon={<CheckCircle2 className="w-4 h-4" />}
                    >
                      {isFull ? 'Join Waitlist' : 'Reserve Seat'}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
};

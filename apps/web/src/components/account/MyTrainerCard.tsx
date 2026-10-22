import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, MessageCircle, Mail, UserCheck, MessagesSquare } from 'lucide-react';
import { Card } from '../ui/Card';
import { Avatar } from './Avatar';
import { TrainerContact, getMyTrainer } from '../../services/portal';
import { phoneDisplay, telHref, whatsappHref } from '../../config/site';

import { useAuth } from '../../context/AuthContext';

/** Shows a member who their coach is: photo, name and how to reach them. */
export const MyTrainerCard: React.FC = () => {
  const { profile } = useAuth();
  const [trainer, setTrainer] = useState<TrainerContact | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getMyTrainer()
      .then(setTrainer)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile?.assigned_trainer_id]);

  return (
    <Card hoverEffect={false} className="flex flex-col gap-4 border-gym-primary/40" aria-label="My trainer">
      <span className="text-xs font-heading text-gym-primary uppercase tracking-widest flex items-center gap-1.5">
        <UserCheck className="w-4 h-4" /> MY TRAINER
      </span>

      {loading ? (
        <p className="text-sm text-gym-muted">Loading...</p>
      ) : error ? (
        <p className="text-sm text-gym-danger">{error}</p>
      ) : !trainer ? (
        <p className="text-sm text-gym-muted">No trainer assigned yet. Ask at the front desk and they will assign a coach to you.</p>
      ) : (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
          <Avatar src={trainer.avatar_url} name={trainer.full_name} size="xl" />
          <div className="flex flex-col gap-2 min-w-0">
            <h3 className="text-2xl font-heading text-white uppercase">{trainer.full_name}</h3>
            <div className="flex flex-wrap justify-center sm:justify-start gap-2 text-xs">
              <Link
                to={`/portal/messages?with=${trainer.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-gradient text-black font-bold"
              >
                <MessagesSquare className="w-3.5 h-3.5" /> Chat in app
              </Link>
              {trainer.phone && (
                <>
                  <a href={telHref(trainer.phone)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gym-border text-white hover:border-gym-primary">
                    <Phone className="w-3.5 h-3.5 text-gym-primary" /> {phoneDisplay(trainer.phone)}
                  </a>
                  <a
                    href={whatsappHref(`Hi ${trainer.full_name}, this is your member from RV Fitness.`, trainer.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gym-border text-white hover:border-gym-primary"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-gym-primary" /> WhatsApp
                  </a>
                </>
              )}
              <a href={`mailto:${trainer.email}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gym-border text-white hover:border-gym-primary break-all">
                <Mail className="w-3.5 h-3.5 text-gym-primary" /> {trainer.email}
              </a>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

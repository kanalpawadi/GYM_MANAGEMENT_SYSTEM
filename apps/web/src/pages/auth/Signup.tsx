import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Dumbbell, User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const Signup: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      loginDemoUser('member');
      setLoading(false);
      navigate('/portal/dashboard');
    }, 500);
  };

  return (
    <>
      <Helmet>
        <title>Create Account | RV Fitness</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-gym-primary/40 bg-gym-surface shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gym-primary text-black flex items-center justify-center mx-auto mb-3 shadow-yellow-glow">
              <Dumbbell className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h1 className="text-3xl font-heading text-white uppercase tracking-wide">
              CREATE <span className="text-gym-primary">ACCOUNT</span>
            </h1>
            <p className="text-xs text-gym-muted mt-1">Join RV Fitness to track attendance, buy plans, and book sessions.</p>
          </div>

          <form onSubmit={handleSignup} className="flex flex-col gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={<User className="w-4 h-4 text-gym-primary" />}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-gym-primary" />}
              required
            />
            <Input
              label="Phone Number (10-Digit Indian Phone)"
              type="tel"
              placeholder="9876543210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4 text-gym-primary" />}
              required
            />
            <Input
              label="Create Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-gym-primary" />}
              required
            />

            <Button type="submit" variant="primary" isLoading={loading} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Create Account & Register
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-gym-muted">
            Already registered?{' '}
            <Link to="/login" className="text-gym-primary font-heading uppercase font-bold hover:underline">
              Sign In
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
};

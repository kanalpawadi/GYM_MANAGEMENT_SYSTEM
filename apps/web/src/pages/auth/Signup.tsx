import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Dumbbell, User, Mail, Phone, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { homePathForRole, useAuth } from '../../context/AuthContext';

export const Signup: React.FC = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmationSent, setConfirmationSent] = useState(false);
  const { signUp, profile, loading } = useAuth();
  const navigate = useNavigate();

  // Projects without email confirmation sign the user in immediately.
  useEffect(() => {
    if (!loading && profile) navigate(homePathForRole(profile.role), { replace: true });
  }, [loading, profile, navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!/^[6-9]\d{9}$/.test(phone.trim())) {
      setErrorMsg('Enter a valid 10-digit Indian mobile number.');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    const { error, needsConfirmation } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      phone: phone.trim(),
    });
    setSubmitting(false);
    if (error) setErrorMsg(error);
    else if (needsConfirmation) setConfirmationSent(true);
  };

  return (
    <>
      <Helmet>
        <title>Create Account | RV Fitness</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-gym-primary/40 bg-gym-surface shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gold-gradient text-black flex items-center justify-center mx-auto mb-3 shadow-yellow-glow">
              <Dumbbell className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h1 className="text-3xl font-heading text-white uppercase tracking-wide">
              CREATE <span className="text-gym-primary">ACCOUNT</span>
            </h1>
            <p className="text-xs text-gym-muted mt-1">Join RV Fitness to track attendance, buy plans, and book sessions.</p>
          </div>

          {confirmationSent ? (
            <div className="bg-gym-success/20 border border-gym-success/40 text-gym-success p-6 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto" />
              <h4 className="font-heading text-xl uppercase">CHECK YOUR EMAIL</h4>
              <p className="text-xs text-white">
                We sent a confirmation link to <strong>{email}</strong>. Confirm your email, then sign in.
              </p>
            </div>
          ) : (
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
              helperText="At least 8 characters"
              minLength={8}
              required
            />

            {errorMsg && <span className="text-xs text-gym-danger font-medium">{errorMsg}</span>}

            <Button type="submit" variant="primary" isLoading={submitting} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Create Account & Register
            </Button>
          </form>
          )}

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

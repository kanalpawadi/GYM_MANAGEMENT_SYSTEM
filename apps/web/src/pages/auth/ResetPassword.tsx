import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Lock, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { homePathForRole, useAuth } from '../../context/AuthContext';

// Landing page for the link in Supabase's password-recovery email.
export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { session, profile, loading, updatePassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (password.length < 8) return setErrorMsg('Password must be at least 8 characters.');
    if (password !== confirm) return setErrorMsg('Passwords do not match.');
    setSubmitting(true);
    const { error } = await updatePassword(password);
    setSubmitting(false);
    if (error) return setErrorMsg(error);
    navigate(profile ? homePathForRole(profile.role) : '/login', { replace: true });
  };

  return (
    <>
      <Helmet>
        <title>Set New Password | RV Fitness</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-gym-primary/40 bg-gym-surface shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-heading text-white uppercase tracking-wide">
              NEW <span className="text-gym-primary">PASSWORD</span>
            </h1>
            <p className="text-xs text-gym-muted mt-1">Choose a new password for your RV Fitness account.</p>
          </div>

          {!loading && !session ? (
            <p className="text-sm text-gym-muted text-center">
              This reset link is invalid or has expired.{' '}
              <Link to="/forgot-password" className="text-gym-primary hover:underline font-medium">
                Request a new one
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-gym-primary" />}
                required
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                leftIcon={<Lock className="w-4 h-4 text-gym-primary" />}
                required
              />
              {errorMsg && <span className="text-xs text-gym-danger font-medium">{errorMsg}</span>}
              <Button type="submit" variant="primary" isLoading={submitting || loading}>Update Password</Button>
            </form>
          )}

          <div className="mt-6 text-center text-xs">
            <Link to="/login" className="text-gym-muted hover:text-white inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
};

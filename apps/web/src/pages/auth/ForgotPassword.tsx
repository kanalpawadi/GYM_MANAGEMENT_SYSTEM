import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setErrorMsg('');
    const { error } = await resetPassword(email.trim());
    setSubmitting(false);
    if (error) setErrorMsg(error);
    else setSent(true);
  };

  return (
    <>
      <Helmet>
        <title>Reset Password | RV Fitness</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-gym-primary/40 bg-gym-surface shadow-2xl">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-heading text-white uppercase tracking-wide">
              FORGOT <span className="text-gym-primary">PASSWORD</span>
            </h1>
            <p className="text-xs text-gym-muted mt-1">Enter your registered email address to receive password reset instructions.</p>
          </div>

          {sent ? (
            <div className="bg-gym-success/20 border border-gym-success/40 text-gym-success p-6 rounded-xl text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 mx-auto" />
              <h4 className="font-heading text-xl uppercase">RESET LINK SENT!</h4>
              <p className="text-xs text-white">We sent a password recovery email to <strong>{email}</strong>.</p>
              <Link to="/login" className="block pt-2">
                <Button variant="outline" size="sm">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Registered Email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4 text-gym-primary" />}
                required
              />
              {errorMsg && <span className="text-xs text-gym-danger font-medium">{errorMsg}</span>}
              <Button type="submit" variant="primary" isLoading={submitting}>Send Reset Link</Button>
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

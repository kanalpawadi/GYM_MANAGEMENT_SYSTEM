import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Dumbbell, Lock, Mail, ArrowRight, UserCheck, Shield, Key } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { loginDemoUser } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      // Default to member login
      loginDemoUser('member');
      navigate('/portal/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSwitch = (role: UserRole) => {
    loginDemoUser(role);
    if (role === 'member') navigate('/portal/dashboard');
    else if (role === 'trainer') navigate('/trainer/dashboard');
    else navigate('/admin/dashboard');
  };

  return (
    <>
      <Helmet>
        <title>Portal Login | RV Fitness</title>
      </Helmet>

      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-gym-primary/40 bg-gym-surface shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-xl bg-gym-primary text-black flex items-center justify-center mx-auto mb-3 shadow-yellow-glow">
              <Dumbbell className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h1 className="text-3xl font-heading text-white uppercase tracking-wide">
              PORTAL <span className="text-gym-primary">LOGIN</span>
            </h1>
            <p className="text-xs text-gym-muted mt-1">Access your membership, QR card, attendance & training plans.</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Input
              label="Email Address"
              type="email"
              placeholder="member@rvfitnessgym.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4 text-gym-primary" />}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4 text-gym-primary" />}
              required
            />

            <div className="flex justify-between items-center text-xs">
              <label className="flex items-center gap-1.5 text-gym-muted cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-gym-primary rounded" /> Remember Me
              </label>
              <Link to="/forgot-password" className="text-gym-primary hover:underline font-medium">
                Forgot Password?
              </Link>
            </div>

            {errorMsg && <span className="text-xs text-gym-danger font-medium">{errorMsg}</span>}

            <Button type="submit" variant="primary" isLoading={loading} rightIcon={<ArrowRight className="w-4 h-4" />}>
              Sign In to Portal
            </Button>
          </form>

          {/* Quick Demo Role Switcher Section */}
          <div className="mt-8 pt-6 border-t border-gym-border text-center">
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest block mb-3">
              ⚡ INSTANT DEV ROLE DEMO SELECTOR
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoSwitch('member')}
                leftIcon={<UserCheck className="w-3.5 h-3.5 text-gym-primary" />}
              >
                Member Portal
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoSwitch('trainer')}
                leftIcon={<Dumbbell className="w-3.5 h-3.5 text-gym-primary" />}
              >
                Trainer Panel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoSwitch('receptionist')}
                leftIcon={<Key className="w-3.5 h-3.5 text-gym-primary" />}
              >
                Reception Scanner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDemoSwitch('owner')}
                leftIcon={<Shield className="w-3.5 h-3.5 text-gym-primary" />}
              >
                Super Admin
              </Button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-gym-muted">
            Don't have an account yet?{' '}
            <Link to="/signup" className="text-gym-primary font-heading uppercase font-bold hover:underline">
              Create Account
            </Link>
          </div>
        </Card>
      </div>
    </>
  );
};

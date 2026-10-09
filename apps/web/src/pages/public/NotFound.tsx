import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Dumbbell, Home as HomeIcon } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const NotFound: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>404 - Page Not Found | RV-Fitness Gym</title>
      </Helmet>

      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 my-12">
        <div className="w-20 h-20 rounded-full bg-gym-primary/10 text-gym-primary flex items-center justify-center mb-6">
          <Dumbbell className="w-10 h-10 animate-bounce" />
        </div>
        <h1 className="text-7xl font-heading text-gym-primary tracking-wide">404</h1>
        <h2 className="text-3xl font-heading text-white uppercase mt-2">LOOKS LIKE YOU DROPPED THE WEIGHT!</h2>
        <p className="text-sm text-gym-muted max-w-md my-4">
          The page you are looking for has been moved, renamed, or doesn't exist. Let's get you back on track!
        </p>
        <Link to="/">
          <Button variant="primary" leftIcon={<HomeIcon className="w-4 h-4" />}>
            Back to Home Page
          </Button>
        </Link>
      </div>
    </>
  );
};

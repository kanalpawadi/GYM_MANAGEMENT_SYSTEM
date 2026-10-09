import React, { useState, useEffect } from 'react';
import { Tag, X, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

export const OfferBanner: React.FC = () => {
  const [showTopBar, setShowTopBar] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // Show promo modal after 3 seconds if not dismissed previously
    const hasSeenModal = sessionStorage.getItem('rv_offer_seen');
    if (!hasSeenModal) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCloseModal = () => {
    setShowModal(false);
    sessionStorage.setItem('rv_offer_seen', 'true');
  };

  return (
    <>
      {/* Top Banner Bar */}
      {showTopBar && (
        <div className="bg-gradient-to-r from-gym-surface via-gym-primary/20 to-gym-surface border-b border-gym-primary/30 py-2 px-4 text-center text-xs sm:text-sm text-white flex items-center justify-center gap-3 relative">
          <div className="flex items-center gap-2 font-heading tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-gym-primary animate-pulse" />
            <span>SPECIAL OFFER: GET FLAT <strong className="text-gym-primary font-bold">20% OFF</strong> ON ANNUAL MEMBERSHIP</span>
            <span className="hidden sm:inline bg-gym-primary text-black font-bold px-2 py-0.5 rounded text-xs ml-2">USE CODE: RVFIT20</span>
          </div>
          <Link to="/plans" className="underline font-bold hover:text-gym-primary text-xs uppercase flex items-center gap-1">
            Claim Offer <ArrowRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setShowTopBar(false)}
            className="absolute right-3 text-gym-muted hover:text-white p-1"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Offer Modal Popup */}
      <Modal isOpen={showModal} onClose={handleCloseModal} maxWidth="lg">
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-gym-primary/20 text-gym-primary flex items-center justify-center mb-4">
            <Tag className="w-7 h-7" />
          </div>
          <span className="text-xs font-heading tracking-widest text-gym-primary uppercase font-semibold">LIMITED TIME FESTIVE OFFER</span>
          <h3 className="text-3xl font-heading text-white uppercase tracking-wide mt-1">
            DIWALI FITNESS BLITZ <span className="text-gym-primary">20% OFF</span>
          </h3>
          <p className="text-sm text-gym-muted mt-2 max-w-md">
            Join RV-Fitness Gym this week and receive a 20% flat discount on all 6-month & 12-month memberships plus a complimentary Gym Bag & Shaker!
          </p>

          <div className="bg-gym-bg border border-dashed border-gym-primary p-4 rounded-xl my-5 w-full flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs text-gym-muted uppercase font-heading">COUPON CODE</p>
              <p className="text-xl font-heading text-gym-primary tracking-widest">RVFIT20</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText('RVFIT20');
                alert('Coupon code RVFIT20 copied to clipboard!');
              }}
            >
              Copy Code
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Link to="/plans" className="w-full" onClick={handleCloseModal}>
              <Button variant="primary" className="w-full">
                View Plans & Claim
              </Button>
            </Link>
            <Button variant="ghost" className="w-full" onClick={handleCloseModal}>
              Maybe Later
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

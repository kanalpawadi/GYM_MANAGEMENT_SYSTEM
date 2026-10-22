import React, { useEffect, useState } from 'react';
import { Tag, X, ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useContent } from '../../content/ContentContext';
import { useGymSettings } from '../../content/useGymSettings';

/** Discount strip and pop-up, shown only while the admin's discount switch is ON. */
export const OfferBanner: React.FC = () => {
  const offer = useContent('offer');
  const { settings } = useGymSettings();
  const discount = settings.discount;
  const [showTopBar, setShowTopBar] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!discount.enabled || !offer.popupEnabled) return;
    let seen = false;
    try {
      seen = !!sessionStorage.getItem('rv_offer_seen');
    } catch {
      // ignore
    }
    if (seen) return;
    const timer = setTimeout(() => setShowModal(true), 3000);
    return () => clearTimeout(timer);
  }, [discount.enabled, offer.popupEnabled]);

  const handleCloseModal = () => {
    setShowModal(false);
    try {
      sessionStorage.setItem('rv_offer_seen', 'true');
    } catch {
      // ignore
    }
  };

  if (!discount.enabled) return null;

  return (
    <>
      {showTopBar && offer.barEnabled && (
        <div className="bg-gradient-to-r from-gym-surface via-gym-primary/20 to-gym-surface border-b border-gym-primary/30 py-2 px-10 text-center text-xs sm:text-sm text-white flex items-center justify-center gap-3 relative">
          <span className="flex items-center gap-2 font-heading tracking-wide uppercase">
            <Sparkles className="w-4 h-4 text-gym-primary animate-pulse shrink-0" />
            <span>
              {discount.label}: <strong className="text-gym-primary font-bold">{discount.percent}% OFF</strong> on all memberships
            </span>
          </span>
          <Link to="/plans" className="underline font-bold hover:text-gym-primary text-xs uppercase flex items-center gap-1 shrink-0">
            View plans <ArrowRight className="w-3 h-3" />
          </Link>
          <button onClick={() => setShowTopBar(false)} className="absolute right-3 text-gym-muted hover:text-white p-1" aria-label="Dismiss banner">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <Modal isOpen={showModal} onClose={handleCloseModal} maxWidth="lg">
        <div className="flex flex-col items-center text-center p-2">
          <div className="w-14 h-14 rounded-full bg-gym-primary/20 text-gym-primary flex items-center justify-center mb-4">
            <Tag className="w-7 h-7" />
          </div>
          <span className="text-xs font-heading tracking-widest text-gym-primary uppercase font-semibold">{offer.popupTag}</span>
          <h3 className="text-3xl font-heading text-white uppercase tracking-wide mt-1">
            {discount.label} <span className="text-gym-primary">{discount.percent}% OFF</span>
          </h3>
          <p className="text-sm text-gym-muted mt-2 max-w-md">{offer.popupText}</p>
          <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
            <Link to="/plans" className="w-full" onClick={handleCloseModal}>
              <Button variant="primary" className="w-full">View Plans</Button>
            </Link>
            <Button variant="ghost" className="w-full" onClick={handleCloseModal}>Maybe Later</Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

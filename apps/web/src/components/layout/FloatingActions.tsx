import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';

export const FloatingActions: React.FC = () => {
  const whatsappUrl = 'https://wa.me/919876543210?text=Hi%20RV-Fitness%20Gym!%20I%20want%20to%20inquire%20about%20membership%20plans%20and%20free%20trials.';

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
      {/* Phone Call Floating Button */}
      <a
        href="tel:+919876543210"
        className="w-12 h-12 rounded-full bg-gym-surface border border-gym-border text-gym-primary flex items-center justify-center shadow-lg hover:scale-110 hover:border-gym-primary transition-all duration-200 group"
        aria-label="Call RV Gym Reception"
        title="Call Gym Receptionist"
      >
        <Phone className="w-5 h-5 group-hover:animate-bounce" />
      </a>

      {/* Floating WhatsApp CTA */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-[#25D366] text-black font-heading font-semibold px-4 py-2.5 rounded-full shadow-yellow-glow hover:scale-105 transition-all duration-200 uppercase tracking-wide text-sm"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-5 h-5 fill-black" />
        <span className="hidden sm:inline">WhatsApp Us</span>
      </a>
    </div>
  );
};

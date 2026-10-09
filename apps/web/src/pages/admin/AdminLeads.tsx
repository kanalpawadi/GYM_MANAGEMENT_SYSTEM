import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { UserPlus, Phone, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';

export const AdminLeads: React.FC = () => {
  const [leads, setLeads] = useState([
    { id: 'l1', name: 'Vikramaditya Roy', phone: '9876543210', status: 'new', date: 'Today', notes: 'Enquired about 1-on-1 personal training.' },
    { id: 'l2', name: 'Simran Kaur', phone: '9876512345', status: 'contacted', date: 'Yesterday', notes: 'Called. Interested in Zumba evening batch.' },
    { id: 'l3', name: 'Rohan Mehta', phone: '9876523456', status: 'trial', date: 'Oct 3', notes: 'Booked 1-day pass for tomorrow morning.' },
    { id: 'l4', name: 'Pooja Bhatt', phone: '9876534567', status: 'converted', date: 'Oct 1', notes: 'Purchased Quarterly Fit plan via UPI!' },
  ]);

  const stages = [
    { key: 'new', title: 'New Leads', badge: 'neutral' },
    { key: 'contacted', title: 'Contacted', badge: 'info' },
    { key: 'trial', title: 'Trial Scheduled', badge: 'warning' },
    { key: 'converted', title: 'Converted', badge: 'success' },
  ];

  const handleAdvanceStage = (leadId: string, currentStatus: string) => {
    const stageMap: Record<string, string> = {
      new: 'contacted',
      contacted: 'trial',
      trial: 'converted',
    };
    const next = stageMap[currentStatus];
    if (next) {
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, status: next } : l)));
    }
  };

  return (
    <>
      <Helmet>
        <title>Lead CRM Pipeline | RV-Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">SALES PIPELINE</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            LEAD CRM <span className="text-gym-primary">KANBAN</span>
          </h1>
        </div>

        {/* Kanban Board Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stages.map((st) => {
            const stageLeads = leads.filter((l) => l.status === st.key);
            return (
              <div key={st.key} className="flex flex-col gap-4 bg-gym-surface/60 border border-gym-border p-4 rounded-xl">
                <div className="flex items-center justify-between pb-3 border-b border-gym-border">
                  <h3 className="text-lg font-heading text-white uppercase">{st.title}</h3>
                  <span className="text-xs bg-gym-primary/20 text-gym-primary font-heading px-2 py-0.5 rounded font-bold">
                    {stageLeads.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {stageLeads.length === 0 ? (
                    <p className="text-xs text-gym-muted text-center py-6">No leads in this stage.</p>
                  ) : (
                    stageLeads.map((lead) => (
                      <Card key={lead.id} className="p-4 border-gym-border bg-gym-surface hover:border-gym-primary/50">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-heading text-white text-lg uppercase">{lead.name}</h4>
                          <span className="text-[10px] text-gym-muted">{lead.date}</span>
                        </div>
                        <p className="text-xs text-gym-primary font-bold mb-2 flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {lead.phone}
                        </p>
                        <p className="text-xs text-gym-muted leading-relaxed mb-4">{lead.notes}</p>

                        {st.key !== 'converted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => handleAdvanceStage(lead.id, lead.status)}
                            rightIcon={<ArrowRight className="w-3 h-3" />}
                          >
                            Advance Stage
                          </Button>
                        )}
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

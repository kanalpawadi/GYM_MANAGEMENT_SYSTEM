import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Search, Plus, Download, Edit, Trash2, CheckCircle2, UserCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { formatINR } from '../../config/site';
import { usePlans } from '../../content/ContentContext';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';

export const AdminMembers: React.FC = () => {
  const PLANS = usePlans();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);

  // New member state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPhone, setNewMemberPhone] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberPlan, setNewMemberPlan] = useState('Six Month');

  const [members, setMembers] = useState([
    { id: 'm1', name: 'Rahul Sharma', phone: '9876543210', email: 'rahul@example.com', plan: 'Six Month', status: 'active', endDate: '18 Nov 2026', paid: '₹4,719' },
    { id: 'm2', name: 'Sneha Reddy', phone: '9876543211', email: 'sneha@example.com', plan: 'Yearly', status: 'active', endDate: '14 May 2027', paid: '₹14,158' },
    { id: 'm3', name: 'Karan Sharma', phone: '9876543212', email: 'karan@example.com', plan: 'Monthly', status: 'expired', endDate: '02 Oct 2026', paid: '₹1,769' },
    { id: 'm4', name: 'Amit Verma', phone: '9876543213', email: 'amit@example.com', plan: 'Six Month', status: 'frozen', endDate: '20 Dec 2026', paid: '₹8,258' },
  ]);

  const handleExportCSV = () => {
    const headers = 'ID,Name,Phone,Email,Plan,Status,EndDate,Paid\n';
    const rows = members.map((m) => `${m.id},${m.name},${m.phone},${m.email},${m.plan},${m.status},${m.endDate},${m.paid}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rv_fitness_members_${Date.now()}.csv`;
    a.click();
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberPhone) return;

    const newObj = {
      id: `m${members.length + 1}`,
      name: newMemberName,
      phone: newMemberPhone,
      email: newMemberEmail || `${newMemberName.toLowerCase().replace(/\s+/g, '')}@example.com`,
      plan: newMemberPlan,
      status: 'active',
      endDate: '06 Jan 2027',
      paid: formatINR(PLANS.find((p) => p.title === newMemberPlan)?.price ?? 0),
    };

    setMembers([newObj, ...members]);
    setShowAddModal(false);
    setNewMemberName('');
    setNewMemberPhone('');
    setNewMemberEmail('');
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.phone.includes(searchTerm);
    const matchesStatus = statusFilter === 'All' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Helmet>
        <title>Member Management | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">MEMBERSHIP DIRECTORY</span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
              MEMBER <span className="text-gym-primary">MANAGEMENT</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} leftIcon={<Download className="w-4 h-4" />}>
              Export CSV
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
              Register New Member
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
          <div className="sm:col-span-8">
            <Input
              placeholder="Search member by name or 10-digit mobile number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-gym-primary" />}
            />
          </div>
          <div className="sm:col-span-4">
            <Select
              options={[
                { label: 'All Statuses', value: 'All' },
                { label: 'Active Members', value: 'active' },
                { label: 'Expired Members', value: 'expired' },
                { label: 'Frozen Members', value: 'frozen' },
              ]}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
        </div>

        {/* Members Table */}
        <Card className="p-0 border-gym-border overflow-hidden bg-gym-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gym-text">
              <thead className="bg-gym-surfaceHover font-heading text-base text-gym-primary uppercase border-b border-gym-border">
                <tr>
                  <th className="p-4">Member Name</th>
                  <th className="p-4">Phone / Email</th>
                  <th className="p-4">Assigned Plan</th>
                  <th className="p-4">Expiry Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-gym-surfaceHover/50">
                    <td className="p-4 font-heading text-white text-base uppercase">{m.name}</td>
                    <td className="p-4">
                      <p className="text-white font-medium">{m.phone}</p>
                      <span className="text-xs text-gym-muted">{m.email}</span>
                    </td>
                    <td className="p-4 font-medium">{m.plan}</td>
                    <td className="p-4 text-gym-muted">{m.endDate}</td>
                    <td className="p-4">
                      <Badge variant={m.status === 'active' ? 'success' : m.status === 'frozen' ? 'warning' : 'danger'}>
                        {m.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => alert(`Viewing profile details for ${m.name}`)} leftIcon={<Edit className="w-4 h-4" />}>
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Add Member Modal */}
        <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="REGISTER NEW GYM MEMBER">
          <form onSubmit={handleAddMember} className="flex flex-col gap-4">
            <Input
              label="Member Full Name"
              placeholder="e.g. Anish Kapoor"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              required
            />
            <Input
              label="Mobile Number (10-Digit Indian Phone)"
              type="tel"
              placeholder="9876543210"
              value={newMemberPhone}
              onChange={(e) => setNewMemberPhone(e.target.value)}
              required
            />
            <Input
              label="Email Address"
              type="email"
              placeholder="anish@example.com"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
            />
            <Select
              label="Select Membership Plan"
              options={PLANS.map((p) => ({ label: `${p.title} (${formatINR(p.price)})`, value: p.title }))}
              value={newMemberPlan}
              onChange={(e) => setNewMemberPlan(e.target.value)}
            />
            <Button type="submit" variant="primary" className="mt-2">
              Confirm Registration & Issue Card
            </Button>
          </form>
        </Modal>
      </div>
    </>
  );
};

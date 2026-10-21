import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ContentProvider } from './content/ContentContext';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { ADMIN_ROLES, CONTENT_EDITOR_ROLES, PORTAL_ROLES, STAFF_ROLES, TRAINER_PANEL_ROLES } from './config/roles';

import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { FloatingActions } from './components/layout/FloatingActions';
import { OfferBanner } from './components/layout/OfferBanner';

// Public Pages
import { Home } from './pages/public/Home';
import { About } from './pages/public/About';
import { Programs } from './pages/public/Programs';
import { Trainers } from './pages/public/Trainers';
import { Plans } from './pages/public/Plans';
import { Schedule } from './pages/public/Schedule';
import { Gallery } from './pages/public/Gallery';
import { Transformations } from './pages/public/Transformations';
import { Blog } from './pages/public/Blog';
import { BlogDetail } from './pages/public/BlogDetail';
import { FAQ } from './pages/public/FAQ';
import { Contact } from './pages/public/Contact';
import { Policies } from './pages/public/Policies';
import { NotFound } from './pages/public/NotFound';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Signup } from './pages/auth/Signup';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';

// Member Portal Pages & Layout
import { MemberPortalLayout } from './pages/member/MemberPortalLayout';
import { MemberDashboard } from './pages/member/MemberDashboard';
import { DigitalCard } from './pages/member/DigitalCard';
import { MembershipCheckout } from './pages/member/MembershipCheckout';
import { PaymentHistory } from './pages/member/PaymentHistory';
import { MemberAttendance } from './pages/member/MemberAttendance';
import { ClassBooking } from './pages/member/ClassBooking';
import { MemberProgress } from './pages/member/MemberProgress';
import { MemberProfile } from './pages/member/MemberProfile';
import { MemberPlans } from './pages/member/MemberPlans';

// Admin Pages & Layout
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminMembers } from './pages/admin/AdminMembers';
import { AdminLeads } from './pages/admin/AdminLeads';
import { AdminAttendanceScanner } from './pages/admin/AdminAttendanceScanner';
import { AdminFinancials } from './pages/admin/AdminFinancials';
import { AdminReports } from './pages/admin/AdminReports';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminContent } from './pages/admin/AdminContent';

// Trainer Panel Page
import { TrainerDashboard } from './pages/trainer/TrainerDashboard';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <AuthProvider>
          <ContentProvider>
          <BrowserRouter>
            <Routes>
              {/* MEMBER PORTAL PROTECTED ROUTES */}
              <Route
                path="/portal/*"
                element={
                  <ProtectedRoute allowedRoles={PORTAL_ROLES}>
                    <MemberPortalLayout>
                      <Routes>
                        <Route path="dashboard" element={<MemberDashboard />} />
                        <Route path="plans" element={<MemberPlans />} />
                        <Route path="digital-card" element={<DigitalCard />} />
                        <Route path="checkout" element={<MembershipCheckout />} />
                        <Route path="payments" element={<PaymentHistory />} />
                        <Route path="attendance" element={<MemberAttendance />} />
                        <Route path="classes" element={<ClassBooking />} />
                        <Route path="progress" element={<MemberProgress />} />
                        <Route path="profile" element={<MemberProfile />} />
                        <Route path="*" element={<Navigate to="/portal/dashboard" replace />} />
                      </Routes>
                    </MemberPortalLayout>
                  </ProtectedRoute>
                }
              />

              {/* TRAINER PANEL PROTECTED ROUTE */}
              <Route
                path="/trainer/*"
                element={
                  <ProtectedRoute allowedRoles={TRAINER_PANEL_ROLES}>
                    <Routes>
                      <Route path="dashboard" element={<TrainerDashboard />} />
                      <Route path="*" element={<Navigate to="/trainer/dashboard" replace />} />
                    </Routes>
                  </ProtectedRoute>
                }
              />

              {/* ADMIN DASHBOARD PROTECTED ROUTES */}
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={STAFF_ROLES}>
                    <AdminLayout>
                      <Routes>
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="members" element={<AdminMembers />} />
                        <Route path="leads" element={<AdminLeads />} />
                        <Route path="attendance" element={<AdminAttendanceScanner />} />
                        <Route path="financials" element={<AdminFinancials />} />
                        <Route path="reports" element={<AdminReports />} />
                        <Route path="settings" element={<AdminSettings />} />
                        <Route
                          path="users"
                          element={
                            <ProtectedRoute allowedRoles={ADMIN_ROLES}>
                              <AdminUsers />
                            </ProtectedRoute>
                          }
                        />
                        <Route
                          path="content"
                          element={
                            <ProtectedRoute allowedRoles={CONTENT_EDITOR_ROLES}>
                              <AdminContent />
                            </ProtectedRoute>
                          }
                        />
                        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                      </Routes>
                    </AdminLayout>
                  </ProtectedRoute>
                }
              />

              {/* AUTH & PUBLIC PAGES */}
              <Route
                path="*"
                element={
                  <div className="min-h-screen bg-gym-bg text-gym-text flex flex-col font-body selection:bg-gym-primary selection:text-black">
                    <OfferBanner />
                    <Navbar />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<About />} />
                        <Route path="/programs" element={<Programs />} />
                        <Route path="/trainers" element={<Trainers />} />
                        <Route path="/plans" element={<Plans />} />
                        <Route path="/schedule" element={<Schedule />} />
                        <Route path="/gallery" element={<Gallery />} />
                        <Route path="/transformations" element={<Transformations />} />
                        <Route path="/blog" element={<Blog />} />
                        <Route path="/blog/:slug" element={<BlogDetail />} />
                        <Route path="/faq" element={<FAQ />} />
                        <Route path="/contact" element={<Contact />} />
                        <Route path="/policies" element={<Policies />} />

                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<Signup />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </main>
                    <Footer />
                    <FloatingActions />
                  </div>
                }
              />
            </Routes>
          </BrowserRouter>
          </ContentProvider>
        </AuthProvider>
      </HelmetProvider>
    </QueryClientProvider>
  );
};

import React, { useState, useEffect } from 'react';
import { Sidebar, NavSection } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { DashboardView } from './components/DashboardView.tsx';
import { MembersView } from './components/MembersView.tsx';
import { AttendanceScannerView } from './components/AttendanceScannerView.tsx';
import { PaymentsView } from './components/PaymentsView.tsx';
import { ReportsView } from './components/ReportsView.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { AddMemberModal } from './components/AddMemberModal.tsx';
import { RenewMemberModal } from './components/RenewMemberModal.tsx';
import { EditMemberModal } from './components/EditMemberModal.tsx';
import { MemberProfileModal } from './components/MemberProfileModal.tsx';
import { BarcodeModal } from './components/BarcodeModal.tsx';
import { LoginView } from './components/LoginView.tsx';
import { SuperAdminView } from './components/SuperAdminView.tsx';
import { PosView } from './components/PosView.tsx';
import { api, getStoredUser, clearAuthSession, setTargetGymId, getTargetGymId } from './lib/api.ts';
import { Member, DashboardStats, UserSession } from './types.ts';
import { ArrowLeft, Building2 } from 'lucide-react';
import { useBusiness } from './context/BusinessContext.tsx';

export default function App() {
  const { business } = useBusiness();

  // Authentication State
  const [user, setUser] = useState<UserSession | null>(() => {
    return getStoredUser() || {
      uid: 'gym_admin_reception',
      email: 'admin@gymmanagement.local',
      name: 'Gym Administrator',
      role: 'GYM_OWNER',
      gymId: 1,
      gymName: 'Gym Management',
    };
  });

  // Active Scoped Gym Name
  const [activeGymName, setActiveGymName] = useState<string>('');
  const displayGymName = activeGymName || business.gymName || 'Gym Management';

  // Navigation State
  const [currentSection, setCurrentSection] = useState<NavSection>(() => {
    return user?.role === 'SUPER_ADMIN' ? 'superadmin' : 'dashboard';
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Core Data State
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberFilter, setMemberFilter] = useState('all');
  const [memberSearch, setMemberSearch] = useState('');

  // Modal States
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [renewingMember, setRenewingMember] = useState<Member | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [viewingProfileId, setViewingProfileId] = useState<number | null>(null);
  const [barcodeTargetMember, setBarcodeTargetMember] = useState<Member | null>(null);

  // Initial Data Load & Session Lifecycle
  useEffect(() => {
    const handleAuthExpired = () => {
      setUser(null);
    };
    window.addEventListener('gym_auth_expired', handleAuthExpired);

    if (user) {
      loadDashboard();
      loadMembers();
    }

    return () => {
      window.removeEventListener('gym_auth_expired', handleAuthExpired);
    };
  }, [user]);

  // Load Dashboard Data
  const loadDashboard = async () => {
    setStatsLoading(true);
    try {
      const data = await api.getDashboard();
      setDashboardStats(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load Members List
  const loadMembers = async (search = memberSearch, filter = memberFilter) => {
    setMembersLoading(true);
    try {
      const list = await api.getMembers(search, filter);
      setMembers(list);
    } catch (err) {
      console.error('Failed to load members:', err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setMemberFilter(newFilter);
    loadMembers(memberSearch, newFilter);
  };

  const handleSearchChange = (newSearch: string) => {
    setMemberSearch(newSearch);
    loadMembers(newSearch, memberFilter);
  };

  const handleArchiveMember = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate/archive this member? Membership history is preserved.')) return;
    try {
      await api.archiveMember(id);
      loadMembers();
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to archive member');
    }
  };

  const handleReactivateMember = async (id: number) => {
    try {
      await api.reactivateMember(id);
      loadMembers();
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to reactivate member');
    }
  };

  const handleDeleteMember = async (id: number) => {
    try {
      await api.deleteMember(id);
      loadMembers();
      loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Failed to delete member');
    }
  };

  const handleSwitchToGym = (targetGymId: number, targetGymName: string) => {
    setTargetGymId(targetGymId);
    setActiveGymName(targetGymName);
    loadDashboard();
    loadMembers();
    setCurrentSection('dashboard');
  };

  const handleReturnToSuperAdmin = () => {
    setTargetGymId(null);
    setActiveGymName('SaaS Platform');
    setCurrentSection('superadmin');
  };

  const handleLoginSuccess = (u: UserSession) => {
    setUser(u);
    setActiveGymName(u.gymName || (u.role === 'SUPER_ADMIN' ? 'SaaS Platform' : business.gymName));
    setCurrentSection(u.role === 'SUPER_ADMIN' ? 'superadmin' : 'dashboard');
  };

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
  };

  // If not authenticated, display login
  if (!user) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const getSectionTitle = () => {
    switch (currentSection) {
      case 'superadmin':
        return 'SaaS Platform Console';
      case 'dashboard':
        return 'System Dashboard';
      case 'members':
        return 'Member Registry';
      case 'pos':
        return 'POS & Sales Register';
      case 'attendance':
        return 'Reception Attendance Scanner';
      case 'payments':
        return 'Financial Collections & Ledger';
      case 'reports':
        return 'Analytics & Closeout Reports';
      case 'settings':
        return 'Gym Settings & Branding';
      default:
        return displayGymName;
    }
  };

  return (
    <div id="app-root" className="min-h-screen bg-[#050505] text-white flex font-sans antialiased selection:bg-[#FACC15] selection:text-black">
      {/* Black & Yellow Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={(sec) => setCurrentSection(sec)}
        onLogout={handleLogout}
        gymName={displayGymName}
        logo={business.logo}
        userRole={user.role}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area (offset for 64 = 256px sidebar on lg) */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64 bg-[#050505]">
        {/* Top Header */}
        <Header
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenAddMember={() => setIsAddMemberOpen(true)}
          onGoToScanner={() => setCurrentSection('attendance')}
          user={user}
          sectionTitle={getSectionTitle()}
        />

        {/* Super Admin Tenant Scoped Banner */}
        {user.role === 'SUPER_ADMIN' && getTargetGymId() && (
          <div className="bg-[#FACC15]/10 border-b border-[#FACC15]/30 px-6 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#FACC15]" />
              <span className="text-gray-300">
                Super Admin scoped to gym tenant: <strong className="text-white uppercase">{activeGymName}</strong> (ID #{getTargetGymId()})
              </span>
            </div>
            <button
              onClick={handleReturnToSuperAdmin}
              className="flex items-center gap-1.5 px-3 py-1 bg-[#FACC15] text-black font-black uppercase text-[10px] rounded-full hover:bg-yellow-300 transition-colors"
            >
              <ArrowLeft className="w-3 h-3 stroke-[3]" />
              <span>Return to Platform Overseer</span>
            </button>
          </div>
        )}

        {/* Dynamic Route Content */}
        <main className="flex-1 p-5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {currentSection === 'superadmin' && (
            <SuperAdminView onSwitchToGym={handleSwitchToGym} />
          )}

          {currentSection === 'dashboard' && (
            <DashboardView
              stats={dashboardStats}
              loading={statsLoading}
              onNavigateToMembers={(filter) => {
                if (filter) handleFilterChange(filter);
                setCurrentSection('members');
              }}
              onNavigateToScanner={() => setCurrentSection('attendance')}
              onOpenAddMember={() => setIsAddMemberOpen(true)}
            />
          )}

          {currentSection === 'members' && (
            <MembersView
              members={members}
              loading={membersLoading}
              onRefresh={() => loadMembers()}
              onOpenAddMember={() => setIsAddMemberOpen(true)}
              onViewProfile={(id) => setViewingProfileId(id)}
              onOpenRenew={(m) => setRenewingMember(m)}
              onOpenEdit={(m) => setEditingMember(m)}
              onOpenBarcode={(m) => setBarcodeTargetMember(m)}
              onArchive={handleArchiveMember}
              onReactivate={handleReactivateMember}
              onDeleteMember={handleDeleteMember}
              currentFilter={memberFilter}
              onFilterChange={handleFilterChange}
              searchQuery={memberSearch}
              onSearchChange={handleSearchChange}
            />
          )}

          {currentSection === 'pos' && <PosView />}

          {currentSection === 'attendance' && (
            <AttendanceScannerView
              onScanSuccess={() => {
                loadDashboard();
                loadMembers();
              }}
            />
          )}

          {currentSection === 'payments' && <PaymentsView />}

          {currentSection === 'reports' && <ReportsView />}

          {currentSection === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Modals */}
      <AddMemberModal
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onMemberAdded={() => {
          loadMembers();
          loadDashboard();
        }}
      />

      <RenewMemberModal
        member={renewingMember}
        isOpen={Boolean(renewingMember)}
        onClose={() => setRenewingMember(null)}
        onRenewSuccess={() => {
          loadMembers();
          loadDashboard();
        }}
      />

      <EditMemberModal
        member={editingMember}
        isOpen={Boolean(editingMember)}
        onClose={() => setEditingMember(null)}
        onMemberUpdated={() => {
          loadMembers();
          loadDashboard();
        }}
      />

      <MemberProfileModal
        memberId={viewingProfileId}
        isOpen={Boolean(viewingProfileId)}
        onClose={() => setViewingProfileId(null)}
        onOpenRenew={(m) => {
          setViewingProfileId(null);
          setRenewingMember(m);
        }}
        onOpenBarcode={(m) => {
          setViewingProfileId(null);
          setBarcodeTargetMember(m);
        }}
      />

      <BarcodeModal
        member={barcodeTargetMember}
        isOpen={Boolean(barcodeTargetMember)}
        onClose={() => setBarcodeTargetMember(null)}
      />
    </div>
  );
}

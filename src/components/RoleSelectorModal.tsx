import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  Check,
  ChevronRight,
  Search,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle,
  KeyRound,
  UserPlus,
  Sliders,
  Sparkles,
  Trash2,
  Save,
  Unlock,
  MapPin,
  Navigation,
  Radio,
  Smartphone,
} from 'lucide-react';
import {
  AppUser,
  AppUserRole,
  UserRolePermissions,
  LiveStaffLocationPing,
  getUserPermissions,
  FULL_ACCESS_PERMISSIONS,
} from '../types/authAndChat';

interface RoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  isStaffAuthenticated?: boolean;
  usersList: AppUser[];
  onUpdateUsersList: (users: AppUser[]) => void;
  onSelectUser: (user: AppUser) => void;
  initialTab?: 'LOGIN' | 'MANAGE_ACCESS';
  liveLocationsMap?: Record<string, LiveStaffLocationPing>;
  onRequestDeviceLocation?: (user?: AppUser) => void;
}

const PERMISSION_TOGGLE_ITEMS: Array<{
  key: keyof UserRolePermissions;
  label: string;
  desc: string;
}> = [
  {
    key: 'hasFullAccess',
    label: '🌟 Full Access to Everything',
    desc: 'Unlocks every tab, table, map, invoice, quote, and setting across the entire app',
  },
  {
    key: 'canAccessMasterHub',
    label: '📊 Master Leads & Quotes Table',
    desc: 'Access the Master Leads & Quotes Hub and Paste Table',
  },
  {
    key: 'canAccessQuickQuote',
    label: '🎙️ Voice Dictation & Quick Quote',
    desc: 'Access Live Voice Dictation, Request Intake Form & Quick Quote',
  },
  {
    key: 'canAccessDispatchMap',
    label: '🗺️ Full Dispatch Map & All Vans',
    desc: 'View all 15 cleaner vans, territories, and live dispatch board',
  },
  {
    key: 'canAccessSchedule',
    label: '📅 Schedule & Unscheduled Jobs',
    desc: 'View and manage the full Jobber calendar and unscheduled queue',
  },
  {
    key: 'canAccessClients',
    label: '👥 Clients Database & Radar',
    desc: 'Search clients, addresses, and Quick Map Schedule Radar',
  },
  {
    key: 'canAccessLeads',
    label: '🔥 Clean Google Sheet & Ad Leads',
    desc: 'Access Facebook Leads, Google Leads, and Clean Sheet view',
  },
  {
    key: 'canAccessQuotesPipeline',
    label: '💬 Quotes Pipeline',
    desc: 'Inspect, create, and follow up on customer quotes',
  },
  {
    key: 'canAccessBillingInvoices',
    label: '💳 Billing & Invoices',
    desc: 'View and manage client invoices and revenue records',
  },
  {
    key: 'canAccessManagement',
    label: '🛠️ Management Hub & Price List',
    desc: 'Access Management Hub, Staff Roster, and Service Price List',
  },
  {
    key: 'canAssignTickets',
    label: '➕ Create & Assign Tickets / AI Dispatch',
    desc: 'Create new service tickets and assign jobs to cleaners',
  },
  {
    key: 'canAccessJobberConfig',
    label: '🔄 Jobber Integration & API Sync',
    desc: 'Configure and trigger Jobber OAuth & live data sync',
  },
  {
    key: 'canAccessQuoPhoneConfig',
    label: '📞 Quo 5-Line Phone & Spam Shield',
    desc: 'Access Quo phone call logs and Twilio Spam Shield blocker',
  },
  {
    key: 'canManageUsersAndAccess',
    label: '🔑 Manage Passwords & Access Control',
    desc: 'Allow this user to edit staff passwords and grant permissions',
  },
];

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  isStaffAuthenticated = false,
  usersList,
  onUpdateUsersList,
  onSelectUser,
  initialTab = 'LOGIN',
  liveLocationsMap = {},
  onRequestDeviceLocation,
}) => {
  const currentUserPerms = getUserPermissions(currentUser);
  const canCurrentUserManageAccess =
    isStaffAuthenticated && (currentUser.role === 'OWNER' || currentUserPerms.canManageUsersAndAccess);

  const [activeModalTab, setActiveModalTab] = useState<'LOGIN' | 'MANAGE_ACCESS'>('LOGIN');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | AppUserRole>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPendingUser, setSelectedPendingUser] = useState<AppUser | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Quick Email/Username + Password direct login state
  const [directLoginIdentifier, setDirectLoginIdentifier] = useState('');
  const [directLoginPassword, setDirectLoginPassword] = useState('');
  const [showDirectPassword, setShowDirectPassword] = useState(false);

  // Owner Access & Password Manager states
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [visiblePasswordsMap, setVisiblePasswordsMap] = useState<Record<string, boolean>>({});
  const [showAddPersonForm, setShowAddPersonForm] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonEmail, setNewPersonEmail] = useState('');
  const [newPersonPhone, setNewPersonPhone] = useState('');
  const [newPersonRole, setNewPersonRole] = useState<AppUserRole>('DISPATCHER');
  const [newPersonTitle, setNewPersonTitle] = useState('Full-Access Operations & Dispatch');
  const [newPersonPassword, setNewPersonPassword] = useState('');
  const [newPersonPin, setNewPersonPin] = useState('');
  const [newPersonFullAccess, setNewPersonFullAccess] = useState(true);
  const [newPersonRequireLocation, setNewPersonRequireLocation] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (initialTab === 'MANAGE_ACCESS' && canCurrentUserManageAccess) {
        setActiveModalTab('MANAGE_ACCESS');
      } else {
        setActiveModalTab('LOGIN');
      }
      setErrorMessage('');
      setSuccessMessage('');
    }
  }, [isOpen, initialTab, canCurrentUserManageAccess]);

  if (!isOpen) return null;

  const ownerUsers = usersList.filter((u) => u.role === 'OWNER');
  const staffUsers = usersList.filter((u) => u.role !== 'OWNER');
  const primaryOwnerAccount =
    ownerUsers.find((u) => u.email.toLowerCase() === 'cleaningserviceyeg@gmail.com') || ownerUsers[0];

  const filteredUsersForLogin = usersList.filter((u) => {
    if (selectedRoleFilter !== 'ALL' && u.role !== selectedRoleFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.phone.includes(q) ||
      (u.assignedVan && u.assignedVan.toLowerCase().includes(q)) ||
      u.title.toLowerCase().includes(q)
    );
  });

  // Does this user require a password?
  // Owner cleaningserviceyeg@gmail.com has noPasswordRequired: true by default
  const doesUserRequirePassword = (user: AppUser): boolean => {
    if (user.email.toLowerCase() === 'cleaningserviceyeg@gmail.com' && user.noPasswordRequired !== false) {
      return false;
    }
    if (user.noPasswordRequired === true) {
      return false;
    }
    return true;
  };

  // Execute authenticated login and trigger cell phone GPS tracking if required
  const completeLogin = (user: AppUser) => {
    const perms = getUserPermissions(user);
    const defaultTab =
      user.role === 'CLEANER' && !perms.hasFullAccess && !perms.canAccessMasterHub && !perms.canAccessDispatchMap
        ? 'MAP'
        : 'MASTER_HUB';
    try {
      localStorage.setItem('bookmycleaning_active_user_id', user.id);
      localStorage.setItem('tidyups_staff_authenticated', 'true');
      localStorage.setItem('tidyups_verified_password_session', 'true');
      localStorage.setItem('tidyups_active_tab', defaultTab);
    } catch (e) {
      console.warn('localStorage error:', e);
    }

    // Immediately request live cell phone GPS location when staff logs in
    if (user.requireLiveLocation !== false && onRequestDeviceLocation) {
      onRequestDeviceLocation(user);
    }

    setSuccessMessage(
      `✓ Logged in as ${user.name} (${user.role})${
        user.requireLiveLocation !== false ? ' • Live Cell Phone GPS Sharing Active!' : ''
      }`
    );
    setTimeout(() => {
      onSelectUser(user);
      onClose();
      setSelectedPendingUser(null);
      setPasswordInput('');
      setDirectLoginPassword('');
      setErrorMessage('');
      setSuccessMessage('');
    }, 250);
  };

  // Handle clicking any user card
  const handleUserClick = (user: AppUser) => {
    setErrorMessage('');
    setSuccessMessage('');
    if (!doesUserRequirePassword(user)) {
      completeLogin(user);
      return;
    }
    setSelectedPendingUser(user);
    setPasswordInput('');
  };

  // Check if a password/PIN matches a given user
  const isCredentialValidForUser = (user: AppUser, enteredRaw: string): boolean => {
    if (!doesUserRequirePassword(user)) return true;
    const entered = enteredRaw.trim();
    if (!entered) return false;

    const validList: string[] = [];
    if (user.password) validList.push(user.password);
    if (user.pin) validList.push(user.pin);

    if (user.role === 'OWNER') {
      validList.push('tidyups2026', 'owner2026');
    } else if (user.role === 'DISPATCHER') {
      validList.push('dispatch2026');
    }

    return validList.some((cred) => cred.toLowerCase() === entered.toLowerCase());
  };

  // Verify password / PIN for the selected user
  const handleVerifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPendingUser) return;

    if (!doesUserRequirePassword(selectedPendingUser)) {
      completeLogin(selectedPendingUser);
      return;
    }

    const entered = passwordInput.trim();
    if (!entered) {
      setErrorMessage(`Password required: Please enter the password or PIN for ${selectedPendingUser.name}.`);
      return;
    }

    if (!isCredentialValidForUser(selectedPendingUser, entered)) {
      setErrorMessage(
        `Incorrect password or PIN for ${selectedPendingUser.name} (${selectedPendingUser.role}). Please try again.`
      );
      return;
    }

    completeLogin(selectedPendingUser);
  };

  // Direct Email/Name + Password login handler
  const handleDirectLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const idQuery = directLoginIdentifier.trim().toLowerCase();
    const pass = directLoginPassword.trim();

    if (!idQuery) {
      setErrorMessage('Please enter your Email or Name (e.g. cleaningserviceyeg@gmail.com, Dominic, Melissa).');
      return;
    }

    // Special instant check for cleaningserviceyeg@gmail.com (Owner - No Password Required)
    if (idQuery === 'cleaningserviceyeg@gmail.com' || idQuery === 'richard') {
      const ownerMatch =
        usersList.find((u) => u.email.toLowerCase() === 'cleaningserviceyeg@gmail.com') || primaryOwnerAccount;
      if (ownerMatch && !doesUserRequirePassword(ownerMatch)) {
        completeLogin(ownerMatch);
        return;
      }
    }

    const matchedUser = usersList.find(
      (u) =>
        u.email.toLowerCase() === idQuery ||
        u.name.toLowerCase() === idQuery ||
        u.name.toLowerCase().includes(idQuery) ||
        (idQuery.replace(/\D/g, '').length >= 4 &&
          u.phone.replace(/\D/g, '').includes(idQuery.replace(/\D/g, '')))
    );

    if (!matchedUser) {
      setErrorMessage('No account found matching that Name or Email. You can also click your profile below.');
      return;
    }

    if (!doesUserRequirePassword(matchedUser)) {
      completeLogin(matchedUser);
      return;
    }

    if (!pass) {
      setSelectedPendingUser(matchedUser);
      setErrorMessage(`Please enter the password or PIN for ${matchedUser.name}.`);
      return;
    }

    if (!isCredentialValidForUser(matchedUser, pass)) {
      setErrorMessage(`Incorrect password or PIN for ${matchedUser.name}.`);
      return;
    }

    completeLogin(matchedUser);
  };

  const handleKeypadPress = (val: string) => {
    if (val === 'CLEAR') {
      setPasswordInput('');
    } else if (val === 'BACK') {
      setPasswordInput((prev) => prev.slice(0, -1));
    } else {
      setPasswordInput((prev) => prev + val);
    }
  };

  // Owner updates a user's field (password, pin, role, customPermissions, noPasswordRequired, requireLiveLocation)
  const handleUpdateSingleUser = (userId: string, patch: Partial<AppUser>, feedback?: string) => {
    const updated = usersList.map((u) => (u.id === userId ? { ...u, ...patch } : u));
    onUpdateUsersList(updated);
    if (feedback) {
      setSuccessMessage(feedback);
      setTimeout(() => setSuccessMessage(''), 2500);
    }
  };

  // Owner toggles a granular permission for a user
  const handleToggleUserPermission = (user: AppUser, permKey: keyof UserRolePermissions) => {
    const currentEffective = getUserPermissions(user);
    const nextValue = !currentEffective[permKey];

    let updatedCustom: Partial<UserRolePermissions> = {
      ...(user.customPermissions || {}),
      [permKey]: nextValue,
    };

    if (permKey === 'hasFullAccess') {
      if (nextValue) {
        updatedCustom = { ...FULL_ACCESS_PERMISSIONS, hasFullAccess: true };
      } else {
        updatedCustom = {
          ...updatedCustom,
          hasFullAccess: false,
        };
      }
    } else if (!nextValue && updatedCustom.hasFullAccess) {
      updatedCustom = {
        ...FULL_ACCESS_PERMISSIONS,
        hasFullAccess: false,
        [permKey]: false,
      };
    }

    handleUpdateSingleUser(
      user.id,
      { customPermissions: updatedCustom },
      `✓ Updated access permissions for ${user.name}`
    );
  };

  // Preset helper: Give user Full Access to Everything, Dispatcher Access, or Cleaner-Only Access
  const handleApplyAccessPreset = (
    user: AppUser,
    preset: 'FULL_EVERYTHING' | 'DISPATCHER_ACCESS' | 'CLEANER_ONLY'
  ) => {
    if (preset === 'FULL_EVERYTHING') {
      handleUpdateSingleUser(
        user.id,
        {
          customPermissions: { ...FULL_ACCESS_PERMISSIONS, hasFullAccess: true },
        },
        `🌟 Granted ${user.name} Full Access to Everything!`
      );
    } else if (preset === 'DISPATCHER_ACCESS') {
      handleUpdateSingleUser(
        user.id,
        {
          customPermissions: {
            hasFullAccess: false,
            canAccessMasterHub: true,
            canAccessQuickQuote: true,
            canAccessDispatchMap: true,
            canAccessSchedule: true,
            canAccessClients: true,
            canAccessLeads: true,
            canAccessManagement: true,
            canViewAllVans: true,
            canAssignTickets: true,
            canAccessQuotesPipeline: true,
            canAccessQuoPhoneConfig: true,
            canAccessBillingInvoices: false,
            canAccessJobberConfig: false,
            canManageUsersAndAccess: false,
            canViewOnlyAssignedJobs: false,
          },
        },
        `📡 Granted ${user.name} Dispatcher & Operations Access!`
      );
    } else {
      handleUpdateSingleUser(
        user.id,
        {
          customPermissions: {
            hasFullAccess: false,
            canAccessMasterHub: false,
            canAccessQuickQuote: false,
            canAccessDispatchMap: false,
            canAccessSchedule: false,
            canAccessClients: false,
            canAccessLeads: false,
            canAccessManagement: false,
            canViewAllVans: false,
            canAssignTickets: false,
            canAccessBillingInvoices: false,
            canAccessQuotesPipeline: false,
            canAccessJobberConfig: false,
            canAccessQuoPhoneConfig: false,
            canManageUsersAndAccess: false,
            canViewOnlyAssignedJobs: true,
          },
        },
        `🧹 Set ${user.name} to Standard Cleaner Access (Assigned Stops Only).`
      );
    }
  };

  // Add a brand-new user account with password, access permissions & mandatory cell phone GPS location
  const handleAddNewPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim() || !newPersonPassword.trim()) {
      setErrorMessage('Please enter a Name and a Password for the new login account.');
      return;
    }

    const newUser: AppUser = {
      id: `user-custom-${Date.now()}`,
      name: newPersonName.trim(),
      email:
        newPersonEmail.trim() ||
        `${newPersonName.trim().toLowerCase().replace(/\s+/g, '.')}@tidyupscleaning.com`,
      phone: newPersonPhone.trim() || '(780) 718-5092',
      role: newPersonRole,
      title: newPersonTitle.trim() || (newPersonFullAccess ? 'Full-Access Staff' : newPersonRole),
      password: newPersonPassword.trim(),
      pin: newPersonPin.trim() || '1234',
      noPasswordRequired: false,
      requireLiveLocation: newPersonRequireLocation,
      customPermissions: newPersonFullAccess
        ? { ...FULL_ACCESS_PERMISSIONS, hasFullAccess: true }
        : undefined,
    };

    const updated = [newUser, ...usersList];
    onUpdateUsersList(updated);
    setNewPersonName('');
    setNewPersonEmail('');
    setNewPersonPhone('');
    setNewPersonPassword('');
    setNewPersonPin('');
    setShowAddPersonForm(false);
    setSuccessMessage(
      `✓ Added ${newUser.name} with password "${newUser.password}" & Live Cell Phone GPS Tracking enabled!`
    );
  };

  const handleDeleteCustomUser = (user: AppUser) => {
    const updated = usersList.filter((u) => u.id !== user.id);
    onUpdateUsersList(updated);
    setSuccessMessage(`Removed login account ${user.name}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 sm:p-5 flex flex-col gap-3 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-pink-300 uppercase tracking-wider block">
                  Owner (No Password) • Staff Password Login • Live Cell Phone GPS Tracking
                </span>
                <h2 className="text-lg font-black text-white">
                  {activeModalTab === 'MANAGE_ACCESS'
                    ? 'Owner Password, Access & Live Cell Phone GPS Center'
                    : 'TidyUps Owner & Staff Login'}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {isStaffAuthenticated ? (
                    <>
                      Signed in as: <strong className="text-pink-300">{currentUser.name}</strong> ({currentUser.role})
                    </>
                  ) : (
                    <span className="text-amber-300 font-bold">
                      👑 Owner (cleaningserviceyeg@gmail.com) logs in with 1 click (No Password) • Staff enter Password/PIN &amp; share Live Cell Phone GPS
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close modal"
            >
              ✕
            </button>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setActiveModalTab('LOGIN');
                setSelectedPendingUser(null);
                setErrorMessage('');
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                activeModalTab === 'LOGIN'
                  ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Owner &amp; Staff Login</span>
            </button>

            {canCurrentUserManageAccess ? (
              <button
                type="button"
                onClick={() => {
                  setActiveModalTab('MANAGE_ACCESS');
                  setSelectedPendingUser(null);
                  setErrorMessage('');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeModalTab === 'MANAGE_ACCESS'
                    ? 'bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-sm'
                    : 'bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-400/40'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>🔑 Manage Passwords, Access &amp; Live GPS (Owner Only)</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1 ml-auto">
                <KeyRound className="w-3 h-3 text-amber-400" />
                <span>Click Owner (cleaningserviceyeg@gmail.com) below to unlock Access Manager</span>
              </span>
            )}
          </div>
        </div>

        {/* Success or Error Notices */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-snug">
              <strong className="block text-rose-950 font-bold mb-0.5">Login Notice:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════════════
            TAB 2: OWNER PASSWORD, ACCESS PERMISSIONS & LIVE CELL PHONE GPS MANAGER
           ═══════════════════════════════════════════════════════════════════════════ */}
        {activeModalTab === 'MANAGE_ACCESS' && canCurrentUserManageAccess ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50">
            {/* Top Banner + Add New Person Button */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white border border-purple-500/40 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <h3 className="font-black text-sm text-white">
                    Owner Master Control: Passwords, Full Access &amp; Live Cell Phone GPS
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Anyone you give access to must allow their cell phone GPS location when they log in, streaming their live position directly to your Dispatch Map at all times!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPersonForm((prev) => !prev)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>{showAddPersonForm ? 'Close Add Form' : '+ Add New Person / Login'}</span>
              </button>
            </div>

            {/* Add New Person Form */}
            {showAddPersonForm && (
              <form
                onSubmit={handleAddNewPerson}
                className="p-4 rounded-2xl bg-white border-2 border-emerald-400 shadow-md space-y-3"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h4 className="font-black text-xs uppercase tracking-wider text-emerald-900 flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span>Add New Person with Password, Access Level &amp; Live Cell Phone GPS</span>
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sarah Manager"
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Email / Username</label>
                    <input
                      type="text"
                      placeholder="sarah@tidyupscleaning.com"
                      value={newPersonEmail}
                      onChange={(e) => setNewPersonEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Cell Phone Number</label>
                    <input
                      type="text"
                      placeholder="(780) 555-0199"
                      value={newPersonPhone}
                      onChange={(e) => setNewPersonPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Role Badge</label>
                    <select
                      value={newPersonRole}
                      onChange={(e) => setNewPersonRole(e.target.value as AppUserRole)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                    >
                      <option value="OWNER">OWNER</option>
                      <option value="DISPATCHER">DISPATCHER</option>
                      <option value="CLEANER">CLEANER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Login Password *</label>
                    <input
                      type="text"
                      required
                      placeholder="Set login password"
                      value={newPersonPassword}
                      onChange={(e) => setNewPersonPassword(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-purple-300 bg-purple-50/40 text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">4-Digit Quick PIN</label>
                    <input
                      type="text"
                      placeholder="e.g. 2026"
                      value={newPersonPin}
                      onChange={(e) => setNewPersonPin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-700 mb-1">Access Level</label>
                    <button
                      type="button"
                      onClick={() => setNewPersonFullAccess((p) => !p)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-black border flex items-center justify-center gap-1.5 cursor-pointer ${
                        newPersonFullAccess
                          ? 'bg-emerald-600 text-white border-emerald-700'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}
                    >
                      {newPersonFullAccess ? '🌟 Access to Everything' : 'Standard Role Access'}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <label className="flex items-center gap-2 text-xs font-extrabold text-emerald-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newPersonRequireLocation}
                      onChange={(e) => setNewPersonRequireLocation(e.target.checked)}
                      className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                    />
                    <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Require Cell Phone Live GPS Location Sharing (See their live location on map at all times)</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddPersonForm(false)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save New Login &amp; Password</span>
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Search & Filter in Password Manager */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search owner, dispatcher, or cleaner to edit password, access, or live GPS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="flex items-center gap-1">
                {(['ALL', 'OWNER', 'DISPATCHER', 'CLEANER'] as const).map((rKey) => (
                  <button
                    key={rKey}
                    type="button"
                    onClick={() => setSelectedRoleFilter(rKey)}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer ${
                      selectedRoleFilter === rKey
                        ? 'bg-slate-900 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {rKey === 'ALL' ? 'All Users' : rKey}
                  </button>
                ))}
              </div>
            </div>

            {/* User List with Password, PIN, Live GPS Status & Access Controls */}
            <div className="space-y-3">
              {filteredUsersForLogin.map((u) => {
                const perms = getUserPermissions(u);
                const isExpanded = expandedUserId === u.id;
                const isPassVisible = Boolean(visiblePasswordsMap[u.id]);
                const isCustomUser = u.id.startsWith('user-custom-');
                const livePing = liveLocationsMap[u.id] || (u.cleanerId ? liveLocationsMap[u.cleanerId] : undefined);
                const requiresPass = doesUserRequirePassword(u);

                return (
                  <div
                    key={u.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* User Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 text-white ${
                            u.role === 'OWNER'
                              ? 'bg-purple-600'
                              : u.role === 'DISPATCHER'
                              ? 'bg-pink-600'
                              : 'bg-emerald-600'
                          }`}
                        >
                          {u.role === 'OWNER' ? '👑' : u.role === 'DISPATCHER' ? '📡' : '🧹'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-xs sm:text-sm text-slate-900">{u.name}</span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase font-mono ${
                                u.role === 'OWNER'
                                  ? 'bg-purple-100 text-purple-800'
                                  : u.role === 'DISPATCHER'
                                  ? 'bg-pink-100 text-pink-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {u.role}
                            </span>
                            {!requiresPass && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-300">
                                🔓 No Password Needed
                              </span>
                            )}
                            {perms.hasFullAccess && (
                              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                🌟 Full Access to Everything
                              </span>
                            )}
                            {livePing ? (
                              <span
                                className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white flex items-center gap-1 shadow-2xs"
                                title={`Live Cell Phone GPS: ${livePing.lat.toFixed(5)}, ${livePing.lng.toFixed(5)} (${livePing.deviceType || 'Cell Phone'})`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                                <span>📡 Live Cell GPS ({livePing.lat.toFixed(4)}, {livePing.lng.toFixed(4)})</span>
                              </span>
                            ) : u.requireLiveLocation !== false ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 flex items-center gap-1">
                                <Smartphone className="w-3 h-3 text-cyan-600" />
                                <span>GPS Required on Phone Login</span>
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {u.email} • {u.phone} {u.assignedVan ? `• ${u.assignedVan}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Role Selector + Quick Access Level Buttons */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <select
                          value={u.role}
                          onChange={(e) =>
                            handleUpdateSingleUser(
                              u.id,
                              { role: e.target.value as AppUserRole },
                              `Changed ${u.name}'s role to ${e.target.value}`
                            )
                          }
                          className="px-2.5 py-1.5 rounded-xl border border-slate-300 text-[11px] font-black text-slate-800 bg-slate-50 cursor-pointer"
                          title="Change user's primary role"
                        >
                          <option value="OWNER">Role: OWNER</option>
                          <option value="DISPATCHER">Role: DISPATCHER</option>
                          <option value="CLEANER">Role: CLEANER</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => handleApplyAccessPreset(u, 'FULL_EVERYTHING')}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer transition-all border ${
                            perms.hasFullAccess
                              ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                          title="Give this person full access to every tab and feature in the app"
                        >
                          <span>🌟 Full Access to Everything</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleApplyAccessPreset(u, 'DISPATCHER_ACCESS')}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                            !perms.hasFullAccess && perms.canAccessDispatchMap && perms.canAccessMasterHub
                              ? 'bg-pink-600 text-white border-pink-700 shadow-xs'
                              : 'bg-pink-50 hover:bg-pink-100 text-pink-900 border-pink-200'
                          }`}
                          title="Give Map, Schedule, Master Table, Voice Dictation & Quotes access"
                        >
                          <span>📡 Dispatch Access</span>
                        </button>

                        {u.role === 'CLEANER' && (
                          <button
                            type="button"
                            onClick={() => handleApplyAccessPreset(u, 'CLEANER_ONLY')}
                            className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all border ${
                              perms.canViewOnlyAssignedJobs && !perms.hasFullAccess
                                ? 'bg-slate-800 text-white border-slate-900'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                            }`}
                            title="Restrict to only their assigned daily cleaner stops & route map"
                          >
                            <span>🧹 My Stops Only</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setExpandedUserId(isExpanded ? null : u.id)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer border ${
                            isExpanded
                              ? 'bg-purple-600 text-white border-purple-700'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          <Sliders className="w-3 h-3" />
                          <span>{isExpanded ? 'Hide Permissions' : 'Custom Permissions'}</span>
                        </button>

                        {isCustomUser && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomUser(u)}
                            className="p-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                            title="Remove custom login account"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Password, PIN, No-Password Toggle & Live Cell GPS Requirement Row */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                      <div className="sm:col-span-4 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <KeyRound className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="text-[11px] font-extrabold text-slate-600 shrink-0">Password:</span>
                        <input
                          type={isPassVisible ? 'text' : 'password'}
                          value={u.password || ''}
                          disabled={!requiresPass}
                          placeholder={requiresPass ? 'Set password...' : 'No password needed'}
                          onChange={(e) =>
                            handleUpdateSingleUser(u.id, {
                              password: e.target.value,
                              noPasswordRequired: false,
                            })
                          }
                          className="flex-1 min-w-0 bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 disabled:bg-slate-100 disabled:text-slate-400"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setVisiblePasswordsMap((prev) => ({ ...prev, [u.id]: !prev[u.id] }))
                          }
                          className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                          title={isPassVisible ? 'Hide password' : 'Show password'}
                        >
                          {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                        <Lock className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                        <span className="text-[11px] font-extrabold text-slate-600 shrink-0">PIN:</span>
                        <input
                          type={isPassVisible ? 'text' : 'password'}
                          value={u.pin || ''}
                          disabled={!requiresPass}
                          placeholder="PIN"
                          onChange={(e) => handleUpdateSingleUser(u.id, { pin: e.target.value })}
                          className="w-20 bg-white px-2 py-1 rounded-lg border border-slate-300 text-xs font-mono font-bold text-slate-900 disabled:bg-slate-100"
                        />
                      </div>

                      <div className="sm:col-span-5 flex flex-wrap items-center justify-end gap-2">
                        <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!requiresPass}
                            onChange={(e) =>
                              handleUpdateSingleUser(
                                u.id,
                                { noPasswordRequired: e.target.checked },
                                e.target.checked
                                  ? `🔓 Enabled 1-Click No-Password Login for ${u.name}`
                                  : `🔒 Password now required for ${u.name}`
                              )
                            }
                            className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                          />
                          <span>No Password</span>
                        </label>

                        <label
                          className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-900 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-200 cursor-pointer"
                          title="When checked, this user must allow cell phone GPS location on login so you see their live location on the map at all times"
                        >
                          <input
                            type="checkbox"
                            checked={u.requireLiveLocation !== false}
                            onChange={(e) =>
                              handleUpdateSingleUser(
                                u.id,
                                { requireLiveLocation: e.target.checked },
                                e.target.checked
                                  ? `📍 Mandatory Live Cell Phone GPS enabled for ${u.name}`
                                  : `Updated GPS preference for ${u.name}`
                              )
                            }
                            className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer"
                          />
                          <MapPin className="w-3 h-3 text-emerald-600" />
                          <span>Require Live Phone GPS</span>
                        </label>
                      </div>
                    </div>

                    {/* Expanded Granular Permissions Checkboxes */}
                    {isExpanded && (
                      <div className="pt-3 border-t border-slate-200 bg-slate-50/80 p-3 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">
                            Granular Feature &amp; Tab Access for {u.name}:
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Check any box to unlock that section for this user
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {PERMISSION_TOGGLE_ITEMS.map((item) => {
                            const checked = Boolean(perms[item.key]);
                            return (
                              <label
                                key={item.key}
                                className={`p-2.5 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                                  checked
                                    ? 'bg-emerald-50/90 border-emerald-400 text-emerald-950'
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100/60'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => handleToggleUserPermission(u, item.key)}
                                  className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-black leading-tight">{item.label}</div>
                                  <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{item.desc}</div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : selectedPendingUser ? (
          /* ═══════════════════════════════════════════════════════════════════════════
              TAB 1A: PASSWORD / PIN ENTRY SCREEN + MANDATORY CELL PHONE GPS NOTICE
             ═══════════════════════════════════════════════════════════════════════════ */
          <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-slate-50">
            <button
              onClick={() => {
                setSelectedPendingUser(null);
                setPasswordInput('');
                setErrorMessage('');
              }}
              className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to accounts list</span>
            </button>

            {/* Profile Being Logged Into */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 text-white ${
                  selectedPendingUser.role === 'OWNER'
                    ? 'bg-purple-600'
                    : selectedPendingUser.role === 'DISPATCHER'
                    ? 'bg-pink-600'
                    : 'bg-emerald-600'
                }`}
              >
                {selectedPendingUser.role === 'OWNER'
                  ? '👑'
                  : selectedPendingUser.role === 'DISPATCHER'
                  ? '📡'
                  : '🧹'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm text-slate-900 truncate">
                    {selectedPendingUser.name}
                  </h3>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                      selectedPendingUser.role === 'OWNER'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : selectedPendingUser.role === 'DISPATCHER'
                        ? 'bg-pink-100 text-pink-700 border border-pink-200'
                        : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {selectedPendingUser.role}
                  </span>
                  {getUserPermissions(selectedPendingUser).hasFullAccess && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      🌟 Full Access
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {selectedPendingUser.title}{' '}
                  {selectedPendingUser.assignedVan ? `• ${selectedPendingUser.assignedVan}` : ''}
                </p>
                <p className="text-[11px] font-mono text-slate-400">{selectedPendingUser.email}</p>
              </div>
            </div>

            {/* Mandatory Live Cell Phone GPS Banner */}
            {selectedPendingUser.requireLiveLocation !== false && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-start gap-2.5">
                <Navigation className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs leading-snug">
                  <strong className="font-black block text-emerald-950">
                    📍 Live Cell Phone GPS Location Required on Login:
                  </strong>
                  <span>
                    When you tap <strong>Verify Password &amp; Log In</strong> on your phone, please tap{' '}
                    <strong>&quot;Allow&quot;</strong> when prompted for your location so Dispatch &amp; Owner can see your live route location in real time.
                  </span>
                </div>
              </div>
            )}

            {/* Password Entry Box */}
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Enter Password or 4-Digit PIN for {selectedPendingUser.name}</span>
                  </span>
                  <span className="text-[11px] text-rose-600 font-bold">
                    Password / PIN Required
                  </span>
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password or 4-digit PIN..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-purple-300 text-base text-slate-900 font-mono tracking-wider focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Fast On-Screen Numeric Keypad for Mobile / Tablet */}
              <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto pt-1">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'CLEAR', '0', 'BACK'].map((btn) => (
                  <button
                    key={btn}
                    type="button"
                    onClick={() => handleKeypadPress(btn)}
                    className={`h-11 rounded-xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center border ${
                      btn === 'CLEAR'
                        ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 text-xs'
                        : btn === 'BACK'
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 text-xs'
                        : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-200 shadow-2xs text-base active:scale-95'
                    }`}
                  >
                    {btn === 'CLEAR' ? 'Clear' : btn === 'BACK' ? '⌫' : btn}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPendingUser(null);
                    setPasswordInput('');
                  }}
                  className="w-1/3 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 via-purple-600 to-pink-600 hover:opacity-95 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <Lock className="w-4 h-4" />
                  <span>Verify Password &amp; Allow Live GPS →</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* ═══════════════════════════════════════════════════════════════════════════
              TAB 1B: 1-CLICK OWNER LOGIN (cleaningserviceyeg@gmail.com) + STAFF PASSWORD LOGIN
             ═══════════════════════════════════════════════════════════════════════════ */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/50">
            {/* 1. 1-CLICK OWNER LOGIN (cleaningserviceyeg@gmail.com - NO PASSWORD REQUIRED) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-pink-900 text-white border-2 border-amber-400 shadow-lg space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">👑</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-black text-sm text-white">
                        Owner Login: cleaningserviceyeg@gmail.com
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400 text-slate-950 uppercase">
                        ✓ No Password Required
                      </span>
                    </div>
                    <p className="text-xs text-purple-200 mt-0.5">
                      Click below to enter the full Owner Console immediately (no password needed for Owner)
                    </p>
                  </div>
                </div>

                {primaryOwnerAccount && (
                  <button
                    type="button"
                    onClick={() => completeLogin(primaryOwnerAccount)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-300 hover:from-amber-300 hover:to-yellow-200 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 shrink-0"
                  >
                    <Unlock className="w-4 h-4 text-slate-950" />
                    <span>1-Click Owner Login (cleaningserviceyeg@gmail.com) →</span>
                  </button>
                )}
              </div>

              {ownerUsers.length > 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-white/15">
                  {ownerUsers.map((owner) => {
                    const isCurrent = isStaffAuthenticated && owner.id === currentUser.id;
                    const needsPass = doesUserRequirePassword(owner);
                    return (
                      <button
                        key={owner.id}
                        type="button"
                        onClick={() => handleUserClick(owner)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-white text-purple-950 border-amber-300 shadow-sm'
                            : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-extrabold text-xs truncate">{owner.name}</div>
                          <div className={`text-[10px] truncate ${isCurrent ? 'text-purple-700' : 'text-purple-200'}`}>
                            {owner.email}
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-emerald-400 text-slate-950 flex items-center gap-1 shrink-0">
                          <Unlock className="w-3 h-3" />
                          <span>{needsPass ? 'Enter Password' : 'Instant Login'}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Direct Email / Name + Password Form */}
            <form
              onSubmit={handleDirectLoginSubmit}
              className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-xs font-black text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  <span>Staff Direct Login (Email / Name + Password or PIN)</span>
                </span>
                <span className="text-[10px] text-emerald-300 font-bold flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Auto-activates Live Cell Phone GPS on Login</span>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <input
                  type="text"
                  placeholder="Email or Name (cleaningserviceyeg@gmail.com, Dominic, Melissa...)"
                  value={directLoginIdentifier}
                  onChange={(e) => setDirectLoginIdentifier(e.target.value)}
                  className="sm:col-span-5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
                />
                <div className="sm:col-span-4 relative">
                  <input
                    type={showDirectPassword ? 'text' : 'password'}
                    placeholder="Password or PIN (blank for Owner)"
                    value={directLoginPassword}
                    onChange={(e) => setDirectLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-800 border border-slate-700 text-xs font-mono text-white placeholder-slate-400 focus:outline-none focus:border-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDirectPassword((p) => !p)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    {showDirectPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <button
                  type="submit"
                  className="sm:col-span-3 px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:opacity-95 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Log In</span>
                </button>
              </div>
            </form>

            {/* 2. DISPATCHERS & CLEANERS (PASSWORD REQUIRED + LIVE CELL PHONE GPS) */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-pink-600" />
                    <span>Dispatchers &amp; Cleaners (Password + Cell Phone GPS Location)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Select your profile to enter your password/PIN and share your live cell phone location
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1">
                  {(['ALL', 'DISPATCHER', 'CLEANER'] as const).map((roleKey) => (
                    <button
                      key={roleKey}
                      type="button"
                      onClick={() => setSelectedRoleFilter(roleKey)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        selectedRoleFilter === roleKey
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {roleKey === 'ALL'
                        ? `All Staff (${staffUsers.length})`
                        : roleKey === 'DISPATCHER'
                        ? 'Dispatchers'
                        : 'Cleaners'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name, van, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-pink-500 shadow-2xs"
                />
              </div>

              {/* Staff List */}
              <div className="space-y-2">
                {filteredUsersForLogin
                  .filter((u) => u.role !== 'OWNER')
                  .map((staff) => {
                    const isCurrent = isStaffAuthenticated && staff.id === currentUser.id;
                    const staffPerms = getUserPermissions(staff);
                    const livePing =
                      liveLocationsMap[staff.id] ||
                      (staff.cleanerId ? liveLocationsMap[staff.cleanerId] : undefined);
                    return (
                      <div
                        key={staff.id}
                        className={`p-3 rounded-2xl border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                          isCurrent
                            ? 'bg-pink-50/70 border-pink-400 ring-2 ring-pink-500/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                              staff.role === 'DISPATCHER'
                                ? 'bg-pink-600 text-white'
                                : 'bg-emerald-600 text-white'
                            }`}
                          >
                            {staff.role === 'DISPATCHER' ? '📡' : '🧹'}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-extrabold text-xs text-slate-900 truncate">
                                {staff.name}
                              </span>
                              <span
                                className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider font-mono ${
                                  staff.role === 'DISPATCHER'
                                    ? 'bg-pink-100 text-pink-700'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {staff.role}
                              </span>
                              {staffPerms.hasFullAccess && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                                  🌟 Full Access
                                </span>
                              )}
                              {livePing && (
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-emerald-600 text-white flex items-center gap-1">
                                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                                  <span>Live GPS Active</span>
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 truncate mt-0.5">
                              {staff.title} {staff.assignedVan ? `• ${staff.assignedVan}` : ''}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">{staff.phone}</p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                          <button
                            type="button"
                            onClick={() => handleUserClick(staff)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <Lock className="w-3 h-3 text-pink-300" />
                            <span>
                              {doesUserRequirePassword(staff) ? 'Enter Password' : '1-Click Login'}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 flex-shrink-0">
          <span className="text-[11px] flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Owner (<strong>cleaningserviceyeg@gmail.com</strong>) logs in with 1 click (no password). All staff logins require Password/PIN &amp; share live cell phone GPS location.
            </span>
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-slate-200 text-slate-800 font-bold hover:bg-slate-300 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

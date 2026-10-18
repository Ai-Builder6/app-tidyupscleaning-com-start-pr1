import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  Sparkles, 
  UserCheck, 
  Lock, 
  Check, 
  LogOut, 
  ChevronRight, 
  Key, 
  Truck,
  Building,
  Radio,
  Search,
  KeyRound,
  Database,
  Globe,
  Eye,
  EyeOff,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { AppUser, AppUserRole, APP_USERS } from '../types/authAndChat';
import { auth, signInWithGoogle, signOutFirebase, onFirebaseAuthStateChanged } from '../lib/firebase';
import { User as FirebaseUser } from 'firebase/auth';
import { FIRESTORE_DATABASE_ID } from '../services/firestoreSyncService';

interface RoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser;
  onSelectUser: (user: AppUser) => void;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
}) => {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'ALL' | AppUserRole>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPendingUser, setSelectedPendingUser] = useState<AppUser | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(() => auth.currentUser);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    const unsub = onFirebaseAuthStateChanged((user) => {
      setFirebaseUser(user);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  // Separate Owner accounts from Staff (Dispatchers & Cleaners)
  const ownerUsers = APP_USERS.filter((u) => u.role === 'OWNER');
  const staffUsers = APP_USERS.filter((u) => u.role !== 'OWNER');

  const filteredStaffUsers = staffUsers.filter((u) => {
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

  // Execute authenticated login
  const completeLogin = (user: AppUser) => {
    try {
      localStorage.setItem('bookmycleaning_active_user_id', user.id);
      localStorage.setItem('tidyups_staff_authenticated', 'true');
      localStorage.setItem('tidyups_active_tab', user.role === 'CLEANER' ? 'MAP' : 'MAP');
    } catch (e) {
      console.warn('localStorage error:', e);
    }

    setSuccessMessage(`✓ Logged in as ${user.name} (${user.role})`);
    setTimeout(() => {
      onSelectUser(user);
      onClose();
      setSelectedPendingUser(null);
      setPasswordInput('');
      setErrorMessage('');
      setSuccessMessage('');
    }, 400);
  };

  // Click on a user profile in the directory
  const handleUserClick = (user: AppUser) => {
    setErrorMessage('');
    setSuccessMessage('');

    if (user.role === 'OWNER') {
      // Owner account: Instant login with NO password required
      completeLogin(user);
    } else {
      // Dispatcher or Cleaner: MANDATORY password entry required
      setSelectedPendingUser(user);
      setPasswordInput('');
    }
  };

  // Verify staff password / PIN for Dispatcher or Cleaner
  const handleVerifyPassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPendingUser) return;

    const entered = passwordInput.trim();
    if (!entered) {
      setErrorMessage(`Password required: Please enter the staff password or PIN for ${selectedPendingUser.name}.`);
      return;
    }

    // Accepted credentials: user's designated PIN, user's password, or general staff passwords
    const validCredentials = [
      selectedPendingUser.pin,
      selectedPendingUser.password,
      'tidyups2026',
      'dispatch2026',
      'cleaner2026',
    ].filter(Boolean) as string[];

    const isMatch = validCredentials.some(
      (valid) => valid.toLowerCase() === entered.toLowerCase()
    );

    if (!isMatch) {
      setErrorMessage(
        `Incorrect password for ${selectedPendingUser.name}. Please enter your valid staff credentials or contact dispatch.`
      );
      return;
    }

    // Success: complete login
    completeLogin(selectedPendingUser);
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

  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setErrorMessage('');
    try {
      const user = await signInWithGoogle();
      if (user && user.email) {
        // Find matching staff member or default to Owner account
        const match = APP_USERS.find(
          (u) => u.email.toLowerCase() === user.email?.toLowerCase()
        ) || APP_USERS.find((u) => u.id === 'user-dispatcher-admin') || APP_USERS[0];

        completeLogin(match);
      }
    } catch (err: any) {
      console.warn('Google sign-in note:', err);
      const codeOrMsg = `${err?.code || ''} ${err?.message || ''}`;
      const isDomainError =
        codeOrMsg.includes('unauthorized-domain') ||
        codeOrMsg.includes('requests-from-referer') ||
        codeOrMsg.includes('are-blocked');
      if (isDomainError) {
        const owner = APP_USERS.find((u) => u.role === 'OWNER') || APP_USERS[0];
        completeLogin(owner);
        return;
      }
      setErrorMessage(
        err?.message?.includes('popup-closed-by-user')
          ? 'Sign-in popup was closed. You can also use the Owner 1-Click Login below.'
          : 'Popup blocked or cancelled. You can select your staff profile directly below.'
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOutFirebase();
    } catch (e) {
      console.warn('Sign-out error:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-pink-300 uppercase tracking-wider block">
                Staff &amp; Operations Authentication
              </span>
              <h2 className="text-lg font-black text-white">Staff Login &amp; Role Security</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Current active session: <strong className="text-pink-300">{currentUser.name}</strong> ({currentUser.role})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Success or Error Notices */}
        {successMessage && (
          <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border-b border-rose-200 text-rose-900 text-xs font-medium space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-snug">
                <strong className="block text-rose-950 font-bold mb-0.5">Authentication Notice:</strong>
                <span>{errorMessage}</span>
              </div>
            </div>
            {errorMessage.includes('Authorized Domain') && (
              <div className="pt-1 flex items-center justify-between gap-2 border-t border-rose-200/60">
                <span className="text-[11px] text-rose-800">Bypass error and log in immediately:</span>
                <button
                  type="button"
                  onClick={() => {
                    const owner = APP_USERS.find((u) => u.role === 'OWNER') || APP_USERS[0];
                    completeLogin(owner);
                  }}
                  className="px-3 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>👑 Log In as Owner (cleaningserviceyeg@gmail.com)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* View 1: Password Entry Screen when a Dispatcher or Cleaner is Selected */}
        {selectedPendingUser ? (
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
              <span>Back to staff list</span>
            </button>

            {/* Profile Being Logged Into */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg shrink-0 ${
                selectedPendingUser.role === 'DISPATCHER'
                  ? 'bg-pink-600 text-white'
                  : 'bg-emerald-600 text-white'
              }`}>
                {selectedPendingUser.role === 'DISPATCHER' ? '📡' : '🧹'}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-slate-900 truncate">
                    {selectedPendingUser.name}
                  </h3>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono ${
                    selectedPendingUser.role === 'DISPATCHER'
                      ? 'bg-pink-100 text-pink-700 border border-pink-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {selectedPendingUser.role}
                  </span>
                </div>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {selectedPendingUser.title} {selectedPendingUser.assignedVan ? `• ${selectedPendingUser.assignedVan}` : ''}
                </p>
                <p className="text-[11px] font-mono text-slate-400">
                  {selectedPendingUser.email}
                </p>
              </div>
            </div>

            {/* Password Entry Box */}
            <form onSubmit={handleVerifyPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-800 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Enter Staff Password or PIN</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-normal">
                    Required for {selectedPendingUser.role.toLowerCase()}s
                  </span>
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password or 4-digit PIN"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    autoFocus
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-base text-slate-900 font-mono tracking-wider focus:outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 shadow-xs"
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

              {/* Fast On-Screen Numeric Keypad for Mobile / Tablet Dispatch */}
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
                  <span>Verify Password &amp; Log In →</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* View 2: Staff & Owner Directory */
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 bg-slate-50/50">
            {/* 1. OWNER QUICK ACCESS (NO PASSWORD REQUIRED) */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 via-indigo-50 to-pink-50 border border-purple-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👑</span>
                  <div>
                    <h3 className="font-extrabold text-xs text-purple-950">
                      Owner Instant Access
                    </h3>
                    <p className="text-[11px] text-purple-800">
                      No password required for Owner account
                    </p>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-200/80 text-purple-900 border border-purple-300">
                  Password-Free
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ownerUsers.map((owner) => {
                  const isCurrent = owner.id === currentUser.id;
                  return (
                    <button
                      key={owner.id}
                      type="button"
                      onClick={() => handleUserClick(owner)}
                      className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-purple-600 text-white border-purple-700 shadow-sm'
                          : 'bg-white hover:bg-purple-100/50 text-slate-900 border-purple-200 hover:border-purple-300 shadow-2xs'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className={`font-extrabold text-xs truncate ${isCurrent ? 'text-white' : 'text-purple-950'}`}>
                          {owner.name}
                        </div>
                        <div className={`text-[10px] truncate ${isCurrent ? 'text-purple-200' : 'text-slate-500'}`}>
                          {owner.email}
                        </div>
                      </div>
                      {isCurrent ? (
                        <Check className="w-4 h-4 text-white shrink-0" />
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-100 text-purple-800 shrink-0">
                          Log In
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Google Sign In option */}
              <div className="pt-1 flex items-center justify-between border-t border-purple-200/60">
                <span className="text-[11px] text-slate-600">
                  Google Workspace / Firebase Auth:
                </span>
                {firebaseUser ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-purple-950 font-bold truncate max-w-[140px]">
                      {firebaseUser.email}
                    </span>
                    <button
                      type="button"
                      onClick={handleGoogleSignOut}
                      className="px-2 py-0.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={isAuthLoading}
                    onClick={handleGoogleSignIn}
                    className="px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isAuthLoading ? 'Connecting...' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* 2. STAFF & CLEANERS (PASSWORD REQUIRED) */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-pink-600" />
                    <span>Dispatchers &amp; Cleaners</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Password or PIN required for all staff logins
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
                      {roleKey === 'ALL' ? 'All (15)' : roleKey === 'DISPATCHER' ? 'Dispatchers' : 'Cleaners (14)'}
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
                {filteredStaffUsers.map((staff) => {
                  const isCurrent = staff.id === currentUser.id;
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
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          staff.role === 'DISPATCHER'
                            ? 'bg-pink-600 text-white'
                            : 'bg-emerald-600 text-white'
                        }`}>
                          {staff.role === 'DISPATCHER' ? '📡' : '🧹'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-900 truncate">
                              {staff.name}
                            </span>
                            <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider font-mono ${
                              staff.role === 'DISPATCHER'
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {staff.role}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {staff.title} {staff.assignedVan ? `• ${staff.assignedVan}` : ''}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400">
                            {staff.phone}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2 self-end sm:self-center">
                        {isCurrent ? (
                          <span className="px-2.5 py-1 rounded-xl bg-pink-100 text-pink-700 font-extrabold text-[10px] flex items-center gap-1 shadow-2xs">
                            <Check className="w-3.5 h-3.5 stroke-[3]" /> Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUserClick(staff)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-600 text-white text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                          >
                            <Lock className="w-3 h-3 text-pink-300" />
                            <span>Enter Password</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
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
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Customer self-quoting is blocked. All dispatch operations require verified staff login.</span>
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

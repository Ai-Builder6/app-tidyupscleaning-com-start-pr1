export type AppUserRole = 'OWNER' | 'DISPATCHER' | 'CLEANER';

export interface UserRolePermissions {
  hasFullAccess: boolean;
  canAccessMasterHub: boolean;
  canAccessQuickQuote: boolean;
  canAccessDispatchMap: boolean;
  canAccessSchedule: boolean;
  canAccessClients: boolean;
  canAccessLeads: boolean;
  canAccessManagement: boolean;
  canViewAllVans: boolean;
  canAssignTickets: boolean;
  canAccessBillingInvoices: boolean;
  canAccessQuotesPipeline: boolean;
  canAccessJobberConfig: boolean;
  canAccessQuoPhoneConfig: boolean;
  canManageUsersAndAccess: boolean;
  canViewOnlyAssignedJobs: boolean;
  canUpdateJobStatus: boolean;
  canChatWithAll: boolean;
}

export interface AppUser {
  id: string;
  name: string;
  role: AppUserRole;
  email: string;
  phone: string;
  avatar?: string;
  cleanerId?: string; // If role === 'CLEANER', references Technician.id (e.g. 'cleaner-1')
  assignedVan?: string;
  title: string;
  pin?: string;
  password?: string;
  noPasswordRequired?: boolean; // True for cleaningserviceyeg@gmail.com Owner login
  requireLiveLocation?: boolean; // True when staff must share live cell phone GPS location
  customPermissions?: Partial<UserRolePermissions>;
}

export interface LiveStaffLocationPing {
  userId: string;
  cleanerId?: string;
  name: string;
  role: AppUserRole;
  email: string;
  phone: string;
  assignedVan?: string;
  lat: number;
  lng: number;
  accuracy?: number;
  speedKmh?: number | null;
  heading?: number | null;
  deviceType?: string;
  batteryLevel?: number | null;
  timestamp: string;
  permissionState?: 'granted' | 'prompt' | 'denied';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: AppUserRole;
  recipientId: string | 'BROADCAST_ALL'; // 'BROADCAST_ALL' or target user id
  recipientName?: string;
  text: string;
  timestamp: string;
  ticketId?: string; // Optional job reference
  read?: boolean;
}

export const APP_USERS: AppUser[] = [
  {
    id: 'user-owner',
    name: 'Richard "Owner Account"',
    role: 'OWNER',
    email: 'cleaningserviceyeg@gmail.com',
    phone: '(780) 718-5092',
    title: 'Owner & Executive Director (No Password Required)',
    noPasswordRequired: true,
    requireLiveLocation: false,
    pin: '1001',
    password: '',
    customPermissions: { hasFullAccess: true },
  },
  {
    id: 'user-dispatcher-admin',
    name: 'Boss iPad Pro 《iPhone》',
    role: 'OWNER',
    email: 'booking@tidyupscleaning.com',
    phone: '(780) 718-5092',
    assignedVan: 'Executive HQ',
    title: 'Executive Admin & Owner',
    noPasswordRequired: true,
    requireLiveLocation: false,
    pin: '1002',
    password: '',
    customPermissions: { hasFullAccess: true },
  },
  {
    id: 'user-dispatcher',
    cleanerId: 'cleaner-15',
    name: 'Dominic Mancini',
    role: 'DISPATCHER',
    email: 'mittens45dm@gmail.com',
    phone: '(587) 385-8329',
    assignedVan: 'Unit 15 (Lead Mobile)',
    title: 'Lead Dispatcher & Operations Manager',
    pin: '2002',
    password: 'dispatch2026',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-1',
    cleanerId: 'cleaner-1',
    name: 'Melissa Clarke',
    role: 'CLEANER',
    email: 'clarkemelissa2025@gmail.com',
    phone: '(780) 954-2409',
    assignedVan: 'Unit 1 (Chappelle Hub)',
    title: 'Senior Cleaner',
    pin: '3001',
    password: 'cleaner3001',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-3',
    cleanerId: 'cleaner-3',
    name: 'Robyn Adele',
    role: 'CLEANER',
    email: 'robynkierstead@hotmail.com',
    phone: '(780) 660-0681',
    assignedVan: 'Unit 3 (Keheewin / South Hub)',
    title: 'Deep Clean & Sanitization Specialist',
    pin: '3003',
    password: 'cleaner3003',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-4',
    cleanerId: 'cleaner-4',
    name: 'Adison Haugland',
    role: 'CLEANER',
    email: 'hauglandadison@gmail.com',
    phone: '(780) 554-2851',
    assignedVan: 'Unit 4 (Oliver / Downtown Hub)',
    title: 'Condo & High-Rise Turnover Lead',
    pin: '3004',
    password: 'cleaner3004',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-5',
    cleanerId: 'cleaner-5',
    name: '1 Joseph Juma',
    role: 'CLEANER',
    email: 'baraka.cleaningservices95@gmail.com',
    phone: '(780) 267-3472',
    assignedVan: 'Unit 5 (Clareview Hub)',
    title: 'Master Move-Out & Commercial Cleaner',
    pin: '3005',
    password: 'cleaner3005',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-7',
    cleanerId: 'cleaner-7',
    name: 'Cindy Guay',
    role: 'CLEANER',
    email: 'cindybg@live.ca',
    phone: '(780) 863-0896',
    assignedVan: 'Unit 7 (Mill Woods Hub)',
    title: 'Eco-Sanitization & Turnover Cleaner',
    pin: '3007',
    password: 'cleaner3007',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-8',
    cleanerId: 'cleaner-8',
    name: 'Jasmin Kunin',
    role: 'CLEANER',
    email: 'kuninjasmin@gmail.com',
    phone: '(780) 802-3373',
    assignedVan: 'Unit 8 (Central Hub)',
    title: 'Residential & Move-Out Cleaner',
    pin: '3008',
    password: 'cleaner3008',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-9',
    cleanerId: 'cleaner-9',
    name: 'Jen & Bryan Cabugon',
    role: 'CLEANER',
    email: 'cedi.cleans@gmail.com',
    phone: '(825) 888-3251',
    assignedVan: 'Unit 9 (Secord / West Hub - Team)',
    title: 'Large Home & Tandem Move-Out Crew',
    pin: '3009',
    password: 'cleaner3009',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-10',
    cleanerId: 'cleaner-10',
    name: 'Sergine Ngongang wetie',
    role: 'CLEANER',
    email: 'tatiwetie@gmail.com',
    phone: '(418) 261-4689',
    assignedVan: 'Unit 10 (Callingwood / West Hub)',
    title: 'Deep Cleaning Specialist',
    pin: '3010',
    password: 'cleaner3010',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-11',
    cleanerId: 'cleaner-11',
    name: 'Joel MBATCHOU',
    role: 'CLEANER',
    email: 'mbatchoujoakim@yahoo.fr',
    phone: '(587) 937-9408',
    assignedVan: 'Unit 11 (Dechene / West Hub)',
    title: 'Turnover & Floor Care Cleaner',
    pin: '3011',
    password: 'cleaner3011',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-12',
    cleanerId: 'cleaner-12',
    name: 'Kilab',
    role: 'CLEANER',
    email: 'kffsfacilityservice10@gmail.com',
    phone: '(647) 466-4476',
    assignedVan: 'Unit 12 (Westwood / North Central Hub)',
    title: 'Commercial & Office Specialist',
    pin: '3012',
    password: 'cleaner3012',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-13',
    cleanerId: 'cleaner-13',
    name: 'N.Dinku',
    role: 'CLEANER',
    email: 'bultoefa@gmail.com',
    phone: '(587) 500-7911',
    assignedVan: 'Unit 13 (Lorelei / North YEG Hub)',
    title: 'Move-Out & Cabinet Specialist',
    pin: '3013',
    password: 'cleaner3013',
    requireLiveLocation: true,
  },
  {
    id: 'cleaner-14',
    cleanerId: 'cleaner-14',
    name: 'Neth & Carmen',
    role: 'CLEANER',
    email: 'nhettemcarmen@yahoo.com',
    phone: '(780) 729-2031',
    assignedVan: 'Unit 14 (The Hamptons / West Hub - Team)',
    title: 'Two-Person Tandem Crew',
    pin: '3014',
    password: 'cleaner3014',
    requireLiveLocation: true,
  },
];

export const FULL_ACCESS_PERMISSIONS: UserRolePermissions = {
  hasFullAccess: true,
  canAccessMasterHub: true,
  canAccessQuickQuote: true,
  canAccessDispatchMap: true,
  canAccessSchedule: true,
  canAccessClients: true,
  canAccessLeads: true,
  canAccessManagement: true,
  canViewAllVans: true,
  canAssignTickets: true,
  canAccessBillingInvoices: true,
  canAccessQuotesPipeline: true,
  canAccessJobberConfig: true,
  canAccessQuoPhoneConfig: true,
  canManageUsersAndAccess: true,
  canViewOnlyAssignedJobs: false,
  canUpdateJobStatus: true,
  canChatWithAll: true,
};

export function getRolePermissions(
  role: AppUserRole,
  customPermissions?: Partial<UserRolePermissions>
): UserRolePermissions {
  let base: UserRolePermissions;
  switch (role) {
    case 'OWNER':
      base = { ...FULL_ACCESS_PERMISSIONS };
      break;
    case 'DISPATCHER':
      base = {
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
        canAccessBillingInvoices: false,
        canAccessQuotesPipeline: true,
        canAccessJobberConfig: false,
        canAccessQuoPhoneConfig: true,
        canManageUsersAndAccess: false,
        canViewOnlyAssignedJobs: false,
        canUpdateJobStatus: true,
        canChatWithAll: true,
      };
      break;
    case 'CLEANER':
    default:
      base = {
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
        canUpdateJobStatus: true,
        canChatWithAll: true,
      };
      break;
  }

  if (!customPermissions) return base;

  if (customPermissions.hasFullAccess) {
    return {
      ...FULL_ACCESS_PERMISSIONS,
      ...customPermissions,
      hasFullAccess: true,
      canViewOnlyAssignedJobs: false,
    };
  }

  const merged: UserRolePermissions = {
    ...base,
    ...customPermissions,
  };

  if (
    merged.canAccessMasterHub ||
    merged.canAccessQuickQuote ||
    merged.canAccessDispatchMap ||
    merged.canAccessSchedule ||
    merged.canAccessClients ||
    merged.canAccessLeads ||
    merged.canAccessManagement ||
    merged.canAccessBillingInvoices ||
    merged.canAccessQuotesPipeline ||
    merged.canViewAllVans
  ) {
    merged.canViewOnlyAssignedJobs = false;
  }

  return merged;
}

export function getUserPermissions(user: AppUser): UserRolePermissions {
  return getRolePermissions(user.role, user.customPermissions);
}

export function hasExpandedConsoleAccess(permissions: UserRolePermissions): boolean {
  return Boolean(
    permissions.hasFullAccess ||
      permissions.canAccessMasterHub ||
      permissions.canAccessQuickQuote ||
      permissions.canAccessDispatchMap ||
      permissions.canAccessSchedule ||
      permissions.canAccessClients ||
      permissions.canAccessLeads ||
      permissions.canAccessManagement ||
      permissions.canAccessQuotesPipeline ||
      permissions.canAccessBillingInvoices ||
      permissions.canAssignTickets ||
      permissions.canAccessJobberConfig ||
      permissions.canAccessQuoPhoneConfig
  );
}

const APP_USERS_STORAGE_KEY = 'tidyups_app_users_v2';

export function mergeUsersWithCanonical(savedUsers?: AppUser[] | null): AppUser[] {
  if (!Array.isArray(savedUsers) || savedUsers.length === 0) {
    return APP_USERS;
  }
  const savedById = new Map<string, AppUser>();
  for (const u of savedUsers) {
    if (u && u.id) savedById.set(u.id, u);
  }
  const merged: AppUser[] = APP_USERS.map((canon) => {
    const existing = savedById.get(canon.id);
    if (!existing) return canon;
    savedById.delete(canon.id);

    // Ensure primary Owner account always uses cleaningserviceyeg@gmail.com with no password required by default
    if (canon.id === 'user-owner') {
      return {
        ...canon,
        ...existing,
        email: 'cleaningserviceyeg@gmail.com',
        noPasswordRequired: existing.noPasswordRequired !== undefined ? existing.noPasswordRequired : true,
        customPermissions: { hasFullAccess: true },
      };
    }

    if (canon.id === 'user-dispatcher-admin') {
      return {
        ...canon,
        ...existing,
        noPasswordRequired: existing.noPasswordRequired !== undefined ? existing.noPasswordRequired : true,
        customPermissions: { hasFullAccess: true },
      };
    }

    return {
      ...canon,
      ...existing,
      email: existing.email || canon.email,
      password: existing.password !== undefined ? existing.password : canon.password,
      pin: existing.pin !== undefined ? existing.pin : canon.pin,
      noPasswordRequired:
        existing.noPasswordRequired !== undefined ? existing.noPasswordRequired : canon.noPasswordRequired,
      requireLiveLocation:
        existing.requireLiveLocation !== undefined
          ? existing.requireLiveLocation
          : canon.requireLiveLocation ?? true,
      customPermissions: existing.customPermissions || canon.customPermissions,
    };
  });
  // Append any custom users added by the Owner
  for (const extra of savedById.values()) {
    merged.push({
      ...extra,
      requireLiveLocation: extra.requireLiveLocation !== undefined ? extra.requireLiveLocation : true,
    });
  }
  return merged;
}

export function loadAppUsers(): AppUser[] {
  if (typeof window === 'undefined') return APP_USERS;
  try {
    const raw = localStorage.getItem(APP_USERS_STORAGE_KEY);
    if (!raw) return APP_USERS;
    const parsed = JSON.parse(raw);
    return mergeUsersWithCanonical(parsed);
  } catch {
    return APP_USERS;
  }
}

export function saveAppUsers(users: AppUser[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(APP_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Could not save app users to localStorage:', e);
  }
  fetch('/api/auth/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users }),
  }).catch((err) => console.warn('Could not sync app users to server:', err));
}

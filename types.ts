export enum AppView {
  PROFILE = 'PROFILE',
  WALLET = 'WALLET',
  JOURNAL = 'JOURNAL',
  REMINDERS = 'REMINDERS',
  PLANS = 'PLANS',
  SETTINGS = 'SETTINGS',
  EXPENDITURES = 'EXPENDITURES'
}

export enum SubscriptionPlan {
  BASIC = 'BASIC',
  PREMIUM = 'PREMIUM',
  PRO = 'PRO',
  ELITE = 'ELITE',
  BUSINESS = 'BUSINESS',
  WINDOWS_INDIVIDUAL = 'WINDOWS_INDIVIDUAL',
  WINDOWS_BUSINESS = 'WINDOWS_BUSINESS'
}

export enum DocumentCategory {
  PERSONAL = 'PERSONAL',
  OTHERS = 'OTHERS',
  BUSINESS = 'BUSINESS'
}

export enum DocumentType {
  BIRTH_CERTIFICATE = 'Birth Certificate',
  ID_CARD = 'ID Card',
  PASSPORT = 'Passport',
  MEDICAL_INSURANCE = 'Medical Insurance',
  HOSPITAL_CARD = 'Medical Hospital Card',
  KRA_PIN = 'KRA PIN',
  VEHICLE_INSURANCE = 'Vehicle Insurance',
  EMPLOYMENT_CARD = 'Employment Card',
  STUDENTS_CARD = 'Students Card',
  DRIVERS_LICENSE = 'Drivers License',
  SHOPPING_CARD = 'Shopping Card',
  REWARD_CARD = 'Reward Card',
  BUSINESS_LICENSE = 'Business License',
  TAX_CERTIFICATE = 'Tax Certificate',
  CONTRACT = 'Contract',
  INCORPORATION_CERTIFICATE = 'Incorporation Certificate',
  ASSET_RECORD = 'Asset Record',
  STAFF_DETAILS = 'Staff Details',
  VEHICLE_DETAILS = 'Vehicle Details',
  OTHER_DOCUMENT = 'Other Document'
}

export enum RelationType {
  SPOUSE = 'Spouse',
  FATHER = 'Father',
  MOTHER = 'Mother',
  SON = 'Son',
  DAUGHTER = 'Daughter',
  BROTHER = 'Brother',
  SISTER = 'Sister',
  PET = 'Pet',
  VEHICLE = 'Vehicle',
  BUSINESS = 'Business',
  STAFF = 'Staff',
  ASSET = 'Asset',
  OTHER = 'Other'
}

export interface CustomLink {
  id: string;
  label: string;
  url: string;
}

export interface SocialHandles {
  twitter?: string;
  linkedin?: string;
  github?: string;
  instagram?: string;
  facebook?: string;
  website?: string;
  tiktok?: string;
  soundcloud?: string;
  youtube?: string;
  ecitizen?: string;
  ntsa?: string;
  sha?: string;
  custom?: CustomLink[];
}

export interface UserProfile {
  fullName: string;
  jobTitle?: string;
  email: string;
  phoneNumber?: string;
  nickName: string;
  age: number;
  weight: string;
  height: string;
  bloodType?: string;
  bio?: string;
  profileImage: string;
  socialHandles?: SocialHandles;
  plan?: SubscriptionPlan;
  subscriptionStatus?: "active" | "past_due" | "unpaid";
  lastPaymentDate?: string;
  companyName?: string;
  companyRegistration?: string;
  companyAddress?: string;
  companyIndustry?: string;
  companySize?: string;
  googleCalendarConnected?: boolean;
  biometricEnabled?: boolean;
  aiCreditsRemaining?: number;
  aiCreditsTotal?: number;
  biometricCredentialId?: string;
}

export interface ReminderConfig {
  oneMonth: boolean;
  twoWeeks: boolean;
  oneWeek: boolean;
  threeDays: boolean;
}

export interface DocumentFile {
  url: string; // Base64
  name: string;
  mimeType: string;
}

export interface StoredDocument {
  id: string;
  type: DocumentType;
  ownerName: string; // "Self" or specific name
  relation: RelationType | 'SELF';
  files: DocumentFile[];
  dateUploaded: string;
  documentNumber?: string;
  customName?: string; // Optional custom label (e.g., "ID Back Side")
  customType?: string; // Used when type is OTHER_DOCUMENT
  expiryDate?: string; // YYYY-MM-DD
  reminderConfig?: ReminderConfig;
  tags?: string[]; // Added tags for organization
  googleCalendarEventId?: string; // Event ID in Google Calendar
  syncToGoogleCalendar?: boolean; // User preference to sync this doc
  isPrivate?: boolean; // Flag to require biometric authentication to view
}

export interface JournalEntry {
  id: string;
  date: string; // ISO date string
  content: string;
}

export interface Task {
  id: string;
  title: string;
  time: string; // HH:mm
  completed: boolean;
  date: string; // YYYY-MM-DD
  googleCalendarEventId?: string;
  syncToGoogleCalendar?: boolean;
  reminderOffsetMinutes?: number; // How many minutes before the task to remind
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'expiry' | 'task' | 'system';
  date: string;
  read: boolean;
}

export interface Expenditure {
  id: string;
  amount: number;
  recipient: string;
  date: string; // YYYY-MM-DD
  time?: string;
  reference: string;
  rawMessage: string;
  paymentFor?: string;
  purchasedItems?: { name: string; amount: number }[];
  paymentMethod?: string;
  type?: 'income' | 'expense';
  createdAt: string; // ISO string
}

export interface Budget {
  id: string;
  category: string;
  amount: number; // Monthly limit
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  name: string; // e.g., Rent, Transport
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'bi-monthly' | 'quarterly' | 'bi-annually' | 'yearly';
  nextDueDate: string; // YYYY-MM-DD
  createdAt: string;
}

export type ShareType = 'view_once' | 'normal';
export type ShareStatus = 'available' | 'viewing' | 'consumed' | 'expired' | 'revoked';

export interface ViewOnceShare {
  id: string;
  token: string;
  documentId: string;
  documentTitle: string;
  documentType: DocumentType;
  ownerUid: string;
  ownerName: string;
  senderEmail?: string;
  shareType: ShareType;
  status: ShareStatus;
  createdAt: string;
  expiresAt: string;
  sessionStartedAt?: string | null;
  currentSessionKey?: string | null;
  viewedAt?: string | null;
  consumedAt?: string | null;
  recipientEmail?: string;
  recipientWatermark?: string;
  payload: {
    type: DocumentType;
    customName?: string;
    customType?: string;
    ownerName: string;
    relation: string;
    documentNumber?: string;
    expiryDate?: string;
    files: DocumentFile[];
  };
}

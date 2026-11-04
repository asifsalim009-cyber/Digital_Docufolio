import { DocumentType, RelationType, UserProfile, SubscriptionPlan } from "./types";

export const INITIAL_PROFILE: UserProfile = {
  fullName: "",
  jobTitle: "",
  email: "",
  phoneNumber: "",
  nickName: "",
  age: 0,
  weight: "",
  height: "",
  bloodType: "",
  bio: "",
  profileImage: "",
  plan: SubscriptionPlan.BASIC,
  biometricEnabled: false,
  socialHandles: {
    twitter: "",
    linkedin: "",
    github: "",
    instagram: "",
    facebook: "",
    website: "",
    tiktok: "",
    soundcloud: "",
    youtube: "",
    custom: []
  }
};

export const DOCUMENT_TYPES_LIST = [
  DocumentType.BIRTH_CERTIFICATE,
  DocumentType.ID_CARD,
  DocumentType.PASSPORT,
  DocumentType.MEDICAL_INSURANCE,
  DocumentType.HOSPITAL_CARD,
  DocumentType.KRA_PIN,
  DocumentType.VEHICLE_INSURANCE,
  DocumentType.EMPLOYMENT_CARD,
  DocumentType.STUDENTS_CARD,
  DocumentType.DRIVERS_LICENSE,
  DocumentType.SHOPPING_CARD,
  DocumentType.REWARD_CARD,
  DocumentType.BUSINESS_LICENSE,
  DocumentType.TAX_CERTIFICATE,
  DocumentType.CONTRACT,
  DocumentType.INCORPORATION_CERTIFICATE,
  DocumentType.ASSET_RECORD,
  DocumentType.STAFF_DETAILS,
  DocumentType.VEHICLE_DETAILS,
  DocumentType.OTHER_DOCUMENT,
];

export const RELATIONS_LIST = [
  RelationType.SPOUSE,
  RelationType.FATHER,
  RelationType.MOTHER,
  RelationType.SON,
  RelationType.DAUGHTER,
  RelationType.BROTHER,
  RelationType.SISTER,
  RelationType.PET,
  RelationType.VEHICLE,
  RelationType.BUSINESS,
  RelationType.STAFF,
  RelationType.ASSET,
  RelationType.OTHER,
];
export interface ExpertLocation {
  address: string;
  city: string;
  lat?: number;
  lng?: number;
}

/** Firestore `experts` collection document */
export interface ExpertProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string;
  category: string;
  location: ExpertLocation;
  profileImage: string;
  idCardImage?: string | null;
  experience?: string;
  rate?: string;
  hours?: string;
  bio?: string;
  createdAt: string;
}

export interface ExpertRegistrationInput {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  category: string;
  skills: string;
  location: ExpertLocation;
  profileImageFile: File;
  idCardImageFile?: File | null;
  experience?: string;
  rate?: string;
  hours?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  createdAt: string;
  role: "user";
}

export interface UserRegistrationInput {
  name: string;
  email: string;
  password?: string; // Optional for Google Auth users who only complete phone/address later
  phone: string;
  address: string;
}

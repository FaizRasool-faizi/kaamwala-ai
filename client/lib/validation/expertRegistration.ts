import * as z from "zod";

const phoneRegex = /^(\+92|0)?3[0-9]{9}$/;

export const registrationSchema = z.object({
  fullName: z
    .string()
    .min(3, "Full name must be at least 3 characters")
    .max(80, "Name is too long"),
  email: z.string().email("Enter a valid email address"),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .regex(phoneRegex, "Use a valid Pakistani mobile number (e.g. 03001234567)"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Password must contain at least one letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  category: z.string().min(1, "Please select a service category"),
  address: z.string().min(5, "Address is too short"),
  city: z.string().min(2, "City is required"),
  skills: z.string().min(3, "Describe your skills"),
  experience: z.string().optional(),
  rate: z.string().optional(),
  hours: z.string().optional(),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;

/** Fields validated on each wizard step before continuing */
export const stepFields: (keyof RegistrationFormData)[][] = [
  ["fullName", "email", "phone", "password"],
  ["category"],
  ["address", "city"],
  ["skills"],
  ["rate", "hours"],
  [],
];

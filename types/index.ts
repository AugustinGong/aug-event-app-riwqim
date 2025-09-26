
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: Date;
  location: string;
  organizerId: string;
  organizer: User;
  menu: MenuCourse[];
  participants: string[];
  qrCode: string;
  isLive: boolean;
  status?: 'upcoming' | 'active' | 'ended';
  createdAt: Date;
  expiresAt?: Date;
}

export interface MenuCourse {
  id: string;
  name: string;
  type: 'appetizer' | 'first' | 'main' | 'dessert' | 'cake';
  description?: string;
  isServed: boolean;
}

export interface Photo {
  id: string;
  eventId: string;
  uploadedBy: string;
  uploader: User;
  url: string;
  thumbnail?: string;
  caption?: string;
  uploadedAt: Date;
}

export interface Notification {
  id: string;
  eventId: string;
  type: 'course_ready' | 'event_update' | 'photo_uploaded';
  title: string;
  message: string;
  data?: any;
  sentAt: Date;
}

export type UserRole = 'organizer' | 'guest';

export interface EventParticipant {
  userId: string;
  user: User;
  role: UserRole;
  joinedAt: Date;
}

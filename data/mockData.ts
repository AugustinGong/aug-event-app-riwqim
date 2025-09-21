
import { Event, User, MenuCourse } from '../types';

export const mockUsers: User[] = [
  {
    id: '1',
    email: 'john@example.com',
    name: 'John Doe',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    createdAt: new Date('2024-01-02'),
  },
];

export const mockMenuCourses: MenuCourse[] = [
  {
    id: '1',
    name: 'Bruschetta',
    type: 'appetizer',
    description: 'Fresh tomatoes, basil, and mozzarella on toasted bread',
    isServed: false,
  },
  {
    id: '2',
    name: 'Caesar Salad',
    type: 'first',
    description: 'Crisp romaine lettuce with parmesan and croutons',
    isServed: false,
  },
  {
    id: '3',
    name: 'Grilled Salmon',
    type: 'main',
    description: 'Atlantic salmon with lemon herb butter',
    isServed: false,
  },
  {
    id: '4',
    name: 'Tiramisu',
    type: 'dessert',
    description: 'Classic Italian dessert with coffee and mascarpone',
    isServed: false,
  },
  {
    id: '5',
    name: 'Birthday Cake',
    type: 'cake',
    description: 'Chocolate cake with vanilla frosting',
    isServed: false,
  },
];

export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Annual Company Dinner',
    description: 'Join us for our annual company celebration dinner',
    date: new Date('2024-12-25T19:00:00'),
    location: 'Grand Hotel Ballroom',
    organizerId: '1',
    organizer: mockUsers[0],
    menu: mockMenuCourses,
    participants: ['1', '2'],
    qrCode: 'aug-event://join/1',
    isLive: false,
    createdAt: new Date('2024-12-01'),
    expiresAt: new Date('2025-06-23'),
  },
];

export const generateMockEvent = (organizer: User): Event => {
  const eventId = Date.now().toString();
  return {
    id: eventId,
    title: 'Sample Event',
    description: 'This is a sample event for demonstration',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    location: 'Sample Location',
    organizerId: organizer.id,
    organizer,
    menu: [
      {
        id: `${eventId}_1`,
        name: 'Welcome Drink',
        type: 'appetizer',
        description: 'Refreshing welcome cocktail',
        isServed: false,
      },
      {
        id: `${eventId}_2`,
        name: 'Main Course',
        type: 'main',
        description: 'Delicious main course',
        isServed: false,
      },
    ],
    participants: [organizer.id],
    qrCode: `aug-event://join/${eventId}`,
    isLive: false,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
  };
};

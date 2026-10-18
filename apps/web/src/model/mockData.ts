import type { Pet, Product, Service, Booking, Order, Profile, CareReminder } from './types';

export const INITIAL_PETS: Pet[] = [
  {
    id: 'pet-1',
    name: 'Winston',
    type: 'dog',
    breed: 'Cavalier King Charles Spaniel',
    age: 3,
    weight: 14,
    gender: 'Male',
    notes: 'Loves chamomile rinses. Soft coat prone to matting around the ears. Quiet but extremely gentle.'
  },
  {
    id: 'pet-2',
    name: 'Cleo',
    type: 'cat',
    breed: 'British Shorthair',
    age: 2,
    weight: 9,
    gender: 'Female',
    notes: 'Sensitive dry skin. Prefers quiet environments, does not tolerate loud blow-dryers.'
  }
];

export const APOTHECARY_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Chamomile Calm Pet Shampoo',
    category: 'grooming',
    price: 24.00,
    description: 'Calming botanical wash infused with roman chamomile, organic aloe leaf juice, and fine colloidal oatmeal extract. Highly recommended for pets with dry, itchy, or hyper-sensitive skin.',
    rating: 4.9,
    stock: 'In Stock',
    ingredients: 'Organic Chamomile Hydrosol, Aloe Vera Extract, Colloidal Oatmeal, Lavender Essential Oil, Plant-Derived Cleansers.',
    colorHex: '#EAE1DB'
  },
  {
    id: 'prod-2',
    name: 'Rosemary Herbal Ear Elixir',
    category: 'wellness',
    price: 18.00,
    description: 'A soothing botanical cleanser crafted to keep ears healthy and clean. Formulated with pure sweet almond oil and rosemary essence to naturally ward off discomfort and balance moisture.',
    rating: 4.8,
    stock: 'In Stock',
    ingredients: 'Witch Hazel, Sweet Almond Oil, Organic Rosemary Extract, Organic Tea Tree Flower Oil, Vegetable Glycerin.',
    colorHex: '#DCE2DC'
  },
  {
    id: 'prod-3',
    name: 'Artisanal Pumpkin & Flax Biscuits',
    category: 'treats',
    price: 14.00,
    description: 'Hand-baked, slow-dehydrated cookies for gut comfort and glossy coats. Enriched with fresh heirloom pumpkin purée, golden flax seeds, and a subtle touch of raw wild honey.',
    rating: 5.0,
    stock: 'Limited Run',
    ingredients: 'Fresh Pumpkin, Organic Flaxseed, Stoneground Oat Flour, Ceylon Cinnamon, Raw Organic Honey.',
    colorHex: '#EAE0D5'
  },
  {
    id: 'prod-4',
    name: 'Raw Brass & Cognac Leather Collar',
    category: 'accessories',
    price: 48.00,
    description: 'A classic, durable accessory made of full-grain vegetable tanned leather from Tuscany, fitted with hand-polished solid brass rivets and secure traditional hardware.',
    rating: 4.9,
    stock: 'In Stock',
    ingredients: 'Tuscan Full-Grain Vegetable-Tanned Leather, Solid Cast Brass.',
    colorHex: '#E8DCCB'
  },
  {
    id: 'prod-5',
    name: 'Sandalwood Botanical Mist',
    category: 'grooming',
    price: 22.00,
    description: 'An elegant, dual-action conditioning fragrance spray to refresh coats instantly between grooms. Leaves a luxurious, woody warm sandalwood scent while smoothing static hair.',
    rating: 4.7,
    stock: 'In Stock',
    ingredients: 'Pure Sandalwood Distillate, Purified Spring Water, Silk Amino Acids, Natural Solubilizers.',
    colorHex: '#E8E1E5'
  },
  {
    id: 'prod-6',
    name: 'Belgian Linen Bolster Bed',
    category: 'accessories',
    price: 95.00,
    description: 'Orthopedic memory-foam sleep bed fitted with a completely removable and washable Belgian linen slipcover. Designed to fit warm boutique home decors seamlessly.',
    rating: 4.8,
    stock: 'Limited Run',
    ingredients: '100% Belgian Flax Linen Cover, Recycled Hypoallergenic Support Foam.',
    colorHex: '#E5E4E2'
  }
];

export const BOUTIQUE_SERVICES: Service[] = [
  {
    id: 'srv-1',
    name: 'The Signature Heritage Bath & Trim',
    price: 85,
    duration: '90 min',
    description: 'Warm bath with premium chamomile organic shampoo, meticulous blow-dry, custom breed scissor trim, ear flush, and sandalwood coat-conditioning mist.'
  },
  {
    id: 'srv-2',
    name: 'Botanical Apothecary Soak',
    price: 45,
    duration: '45 min',
    description: 'Specialized deep-hydration warm herbal bath with calendula and lavender extracts, accompanied by scalp massage and moisturizing paw cream.'
  },
  {
    id: 'srv-3',
    name: 'Essential Groom & Paw Care',
    price: 50,
    duration: '40 min',
    description: 'Precision claw trim & file, warm ear flush, sanitary trim, paw pad hygiene shave, and finishing botanical coat mist.'
  }
];

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'b-1',
    petId: 'pet-1',
    petName: 'Winston',
    serviceId: 'srv-1',
    serviceName: 'The Signature Heritage Bath & Trim',
    date: '2026-10-05',
    time: '10:30 AM',
    notes: 'Please keep the ears neat and pay special attention to knots under his collar.',
    status: 'Scheduled',
    price: 85,
    staff: 'Claire Dumont'
  }
];

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ord-1042',
    items: [
      { productId: 'prod-1', productName: 'Chamomile Calm Pet Shampoo', quantity: 1, price: 24.00 },
      { productId: 'prod-3', productName: 'Artisanal Pumpkin & Flax Biscuits', quantity: 2, price: 14.00 }
    ],
    total: 52.00,
    date: '2026-09-25',
    status: 'Delivered',
    address: '142 Orchard Street, Apt 3B, New York NY 10002'
  }
];

export const INITIAL_PROFILE: Profile = {
  name: 'Eleanor Vance',
  email: 'eleanor.vance@boutiqueparents.com',
  phone: '(555) 321-7890',
  address: '142 Orchard Street, Apt 3B, New York NY 10002',
  memberSince: 'December 2024',
  premiumStatus: true
};

export const INITIAL_REMINDERS: CareReminder[] = [
  {
    id: 'rem-1',
    petName: 'Winston',
    title: 'Monthly Tick & Heartworm Prevention',
    dueDate: '2026-10-01',
    type: 'treatment',
    urgency: 'urgent'
  },
  {
    id: 'rem-2',
    petName: 'Winston',
    title: 'Rabies Booster Vaccine',
    dueDate: '2026-10-12',
    type: 'vaccine',
    urgency: 'upcoming'
  },
  {
    id: 'rem-3',
    petName: 'Cleo',
    title: 'Annual Feline Dental Evaluation',
    dueDate: '2026-10-22',
    type: 'checkup',
    urgency: 'upcoming'
  }
];

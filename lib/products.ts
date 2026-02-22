// import { Product } from '@/context/CartContext'

export interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image: string
  specs?: { label: string; value: string }[]
}

export const categories = [
  {
    id: 'brakes',
    name: 'Brakes',
    icon: '🔧',
    description: 'Brake pads, rotors, calipers & more',
  },
  {
    id: 'filters',
    name: 'Filters',
    icon: '🔍',
    description: 'Air, oil, fuel & cabin filters',
  },
  {
    id: 'tires',
    name: 'Tires',
    icon: '🛞',
    description: 'All-season, performance & off-road',
  },
  {
    id: 'batteries',
    name: 'Batteries',
    icon: '🔋',
    description: 'Starting, deep cycle & AGM',
  },
  {
    id: 'engine',
    name: 'Engine Parts',
    icon: '⚙️',
    description: 'Pistons, gaskets, timing belts',
  },
  {
    id: 'suspension',
    name: 'Suspension',
    icon: '🚗',
    description: 'Shocks, struts, springs & more',
  },
]

export const products: Product[] = [
  {
    id: '1',
    name: 'Premium Ceramic Brake Pads',
    price: 89.99,
    image:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    category: 'brakes',
    description:
      'High-performance ceramic brake pads with low dust and noise. OEM quality for superior stopping power.',
    specs: [
      { label: 'Material', value: 'Ceramic' },
      { label: 'Position', value: 'Front' },
      { label: 'Warranty', value: '3 Years' },
    ],
  },
  {
    id: '2',
    name: 'Performance Air Filter',
    price: 45.99,
    image:
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop',
    category: 'filters',
    description:
      'Washable and reusable high-flow air filter. Increases horsepower and acceleration.',
    specs: [
      { label: 'Type', value: 'High-Flow' },
      { label: 'Reusable', value: 'Yes' },
      { label: 'Warranty', value: 'Lifetime' },
    ],
  },
  {
    id: '3',
    name: 'All-Season Touring Tire',
    price: 159.99,
    image:
      'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=400&h=300&fit=crop',
    category: 'tires',
    description:
      'Premium all-season tire with excellent wet and dry traction. 65,000-mile warranty.',
    specs: [
      { label: 'Size', value: '225/55R17' },
      { label: 'Season', value: 'All-Season' },
      { label: 'Mileage', value: '65,000 mi' },
    ],
  },
  {
    id: '4',
    name: 'AGM Car Battery 12V',
    price: 199.99,
    image:
      'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400&h=300&fit=crop',
    category: 'batteries',
    description:
      'Advanced AGM technology with superior cold cranking amps. Maintenance-free design.',
    specs: [
      { label: 'Voltage', value: '12V' },
      { label: 'CCA', value: '800' },
      { label: 'Warranty', value: '5 Years' },
    ],
  },
  {
    id: '5',
    name: 'Timing Belt Kit',
    price: 249.99,
    image:
      'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=400&h=300&fit=crop',
    category: 'engine',
    description:
      'Complete timing belt kit with tensioner, idler pulleys, and water pump. OEM specifications.',
    specs: [
      { label: 'Components', value: 'Complete Kit' },
      { label: 'Quality', value: 'OEM Spec' },
      { label: 'Warranty', value: '2 Years' },
    ],
  },
  {
    id: '6',
    name: 'Gas Shock Absorbers',
    price: 129.99,
    image:
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&h=300&fit=crop',
    category: 'suspension',
    description:
      'Premium gas-charged shock absorbers for improved handling and ride comfort. Sold in pairs.',
    specs: [
      { label: 'Type', value: 'Gas-Charged' },
      { label: 'Position', value: 'Front' },
      { label: 'Quantity', value: 'Pair' },
    ],
  },
  {
    id: '7',
    name: 'Drilled & Slotted Rotors',
    price: 179.99,
    image:
      'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=400&h=300&fit=crop',
    category: 'brakes',
    description:
      'Performance drilled and slotted brake rotors. Better heat dissipation and reduced brake fade.',
    specs: [
      { label: 'Style', value: 'Drilled & Slotted' },
      { label: 'Position', value: 'Front' },
      { label: 'Quantity', value: 'Pair' },
    ],
  },
  {
    id: '8',
    name: 'Oil Filter Premium',
    price: 12.99,
    image:
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    category: 'filters',
    description:
      'High-capacity oil filter with synthetic media. 99% filtration efficiency.',
    specs: [
      { label: 'Media', value: 'Synthetic' },
      { label: 'Efficiency', value: '99%' },
      { label: 'Interval', value: '10,000 mi' },
    ],
  },
]

export const featuredProducts = products.slice(0, 6)

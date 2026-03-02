// src/components/SensorCard.tsx

import { LucideProps } from 'lucide-react';

interface SensorCardProps {
  icon: React.ComponentType<LucideProps>;
  name: string;
  value: string | number;
  unit: string;
}

// A reusable component to display a single sensor reading in a visually appealing card.
export default function SensorCard({ icon: Icon, name, value, unit }: SensorCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center justify-center space-y-2">
      <Icon className="w-10 h-10 text-green-600" />
      <p className="text-lg font-medium text-gray-600">{name}</p>
      <p className="text-4xl font-bold text-gray-800">{value}<span className="text-xl font-medium text-gray-500">{unit}</span></p>
    </div>
  );
}

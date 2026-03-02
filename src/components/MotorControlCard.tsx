// src/components/MotorControlCard.tsx

import { Fan } from 'lucide-react';

interface MotorControlCardProps {
  isOn: boolean;
  onToggle: () => void;
  isLoading: boolean;
}

// This component provides a toggle switch to control the motor.
export default function MotorControlCard({ isOn, onToggle, isLoading }: MotorControlCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md flex flex-col items-center justify-center space-y-4">
      <Fan className={`w-10 h-10 text-green-600 ${isOn ? 'animate-spin' : ''}`} />
      <h2 className="text-lg font-medium text-gray-600">Water Pump</h2>
      <div className="flex items-center space-x-4">
        <span className={`font-bold ${isOn ? 'text-green-600' : 'text-gray-500'}`}>
          {isOn ? 'ON' : 'OFF'}
        </span>
        <button
          onClick={onToggle}
          disabled={isLoading}
          className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${isOn ? 'bg-green-600' : 'bg-gray-300'}`}
        >
          <span
            className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform duration-200 ease-in-out ${isOn ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>
      {isLoading && <p className="text-xs text-gray-400">Updating...</p>}
    </div>
  );
}

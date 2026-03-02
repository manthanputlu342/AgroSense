// src/components/Automation.tsx

import { useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

// This component provides a UI for setting up alarms and timers.
export default function Automation() {
  const [alarmThreshold, setAlarmThreshold] = useState(20);
  const [isAutoEnabled, setIsAutoEnabled] = useState(false);
  const [timerTime, setTimerTime] = useState('07:00');
  const [timerDuration, setTimerDuration] = useState(30);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from Firestore on mount
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'automation');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setAlarmThreshold(data.alarmThreshold ?? 20);
        setIsAutoEnabled(data.isAutoEnabled ?? false);
        setTimerTime(data.timerTime ?? '07:00');
        setTimerDuration(data.timerDuration ?? 30);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const settingsRef = doc(db, 'settings', 'automation');
      await setDoc(settingsRef, {
        alarmThreshold,
        isAutoEnabled,
        timerTime,
        timerDuration,
        updatedAt: new Date()
      });
      alert('Automation settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md col-span-1 lg:col-span-2">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Automation Rules</h3>
      <div className="space-y-6">
        {/* Alarm Settings */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium text-gray-600">Low Soil Moisture Alarm</h4>
            <label className="flex items-center cursor-pointer">
              <div className="mr-3 text-sm font-medium text-gray-500">Auto-Irrigation</div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only" 
                  checked={isAutoEnabled}
                  onChange={() => setIsAutoEnabled(!isAutoEnabled)}
                />
                <div className={`block w-10 h-6 rounded-full transition ${isAutoEnabled ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${isAutoEnabled ? 'translate-x-4' : ''}`}></div>
              </div>
            </label>
          </div>
          <p className="text-sm text-gray-500 mb-2">Get an alert and automatically turn the pump on when soil moisture drops below this value.</p>
          <div className="flex items-center space-x-3">
            <input
              type="range"
              min="0"
              max="100"
              value={alarmThreshold}
              onChange={(e) => setAlarmThreshold(Number(e.target.value))}
              className="w-full"
            />
            <span className="font-bold text-gray-700 w-12 text-right">{alarmThreshold}%</span>
          </div>
        </div>

        {/* Timer Settings */}
        <div>
          <h4 className="font-medium text-gray-600">Scheduled Watering</h4>
          <p className="text-sm text-gray-500 mb-2">Automatically turn the pump on at a specific time.</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Start Time</label>
              <input
                type="time"
                value={timerTime}
                onChange={(e) => setTimerTime(e.target.value)}
                className="w-full px-3 py-2 text-gray-700 bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Duration (minutes)</label>
              <input
                type="number"
                value={timerDuration}
                onChange={(e) => setTimerDuration(Number(e.target.value))}
                className="w-full px-3 py-2 text-gray-700 bg-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full py-2 text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Automation Rules'}
        </button>
      </div>
    </div>
  );
}

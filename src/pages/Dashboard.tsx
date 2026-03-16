// src/pages/Dashboard.tsx
// @ts-nocheck
import { useState, useEffect } from 'react';
import { auth, db } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit, doc, setDoc, getDoc } from 'firebase/firestore';
import { SensorData } from '../types';
import SensorCard from '../components/SensorCard';
import MotorControlCard from '../components/MotorControlCard';
import HistoryChart from '../components/HistoryChart';
import { Thermometer, Droplets, Sun, Waves, Bell, Calendar, Container } from 'lucide-react';
import VoiceAssistant from '../components/VoiceAssistant';
import Automation from '../components/Automation';
import { FarmingCommand } from '../services/voiceCommand';

// The main dashboard component, displayed after a user logs in.
export default function Dashboard() {
  const [sensorHistory, setSensorHistory] = useState<SensorData[]>([]);
  const [latestData, setLatestData] = useState<SensorData | null>(null);
  const [isMotorOn, setIsMotorOn] = useState(false);
  const [isLoadingMotor, setIsLoadingMotor] = useState(true);
  const [alarm, setAlarm] = useState<string | null>(null);
  const [threshold, setThreshold] = useState(20);
  const [isAutoEnabled, setIsAutoEnabled] = useState(false);

  // Effect to listen for automation settings
  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'automation');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setThreshold(data.alarmThreshold);
        setIsAutoEnabled(data.isAutoEnabled || false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect to listen for real-time sensor data from Firestore.
  useEffect(() => {
    // Order by timestamp descending to get the newest data first
    const q = query(collection(db, 'sensor_data'), orderBy('timestamp', 'desc'), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const history = snapshot.docs.map(doc => {
        const data = doc.data();
        let timestamp: Date;
        
        // Handle different timestamp formats (Firestore Timestamp vs Epoch Number)
        if (data.timestamp?.toDate) {
          timestamp = data.timestamp.toDate();
        } else if (typeof data.timestamp === 'number' && data.timestamp > 946684800) { // Greater than year 2000
          timestamp = new Date(data.timestamp * 1000);
        } else {
          timestamp = new Date();
        }
        
        return { 
          id: doc.id, 
          ...data,
          timestamp 
        } as SensorData;
      });
      
      // Since we order by desc, the first item is the latest
      setSensorHistory(history);
      if (history.length > 0) {
        const currentData = history[0]; // Latest document
        setLatestData(currentData);
        // Check for alarms
        if (currentData.soilMoisture < threshold) {
          setAlarm(`Alert: Soil moisture is low! (${currentData.soilMoisture}%)`);
          
          // AUTO-IRRIGATION LOGIC
          if (isAutoEnabled && !isMotorOn) {
            console.log("Auto-Irrigation: Starting motor...");
            const motorControlRef = doc(db, 'control', 'motor');
            setDoc(motorControlRef, { isOn: true });
          }
        } else {
          setAlarm(null);
        }
      }
    });
    return () => unsubscribe();
  }, [threshold, isAutoEnabled, isMotorOn]);

  // Effect to listen for motor control state from Firestore.
  useEffect(() => {
    const motorControlRef = doc(db, 'control', 'motor');
    const unsubscribe = onSnapshot(motorControlRef, (doc) => {
      if (doc.exists()) {
        setIsMotorOn(doc.data().isOn);
      }
      setIsLoadingMotor(false);
    });
    return () => unsubscribe();
  }, []);

  // Handles the user sign-out process.
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Toggles the motor state in Firestore.
  const handleMotorToggle = async () => {
    setIsLoadingMotor(true);
    const motorControlRef = doc(db, 'control', 'motor');
    try {
      await setDoc(motorControlRef, { isOn: !isMotorOn });
    } catch (error) {
      console.error('Error toggling motor:', error);
    }
    // The loading state will be reset by the onSnapshot listener
  };

  // Helper to seed some initial data for testing
  const seedData = async () => {
    const sensorCollection = collection(db, 'sensor_data');
    const now = new Date();
    for (let i = 0; i < 10; i++) {
        const timestamp = new Date(now.getTime() - (10 - i) * 60000);
        await setDoc(doc(sensorCollection), {
            temperature: 22 + Math.random() * 5,
            humidity: 40 + Math.random() * 20,
            soilMoisture: 15 + Math.random() * 30,
            ldr: 500 + Math.random() * 200,
            timestamp: timestamp
        });
    }
    alert('Sample data seeded!');
  };

  // Processes structured farming commands.
  const handleVoiceCommand = async (command: FarmingCommand) => {
    switch (command.action) {
      case 'turn_on_motor':
        if (!isMotorOn) await handleMotorToggle();
        break;
      case 'turn_off_motor':
        if (isMotorOn) await handleMotorToggle();
        break;
      case 'schedule_irrigation':
        if (command.time) {
          const settingsRef = doc(db, 'settings', 'automation');
          await setDoc(settingsRef, {
            timerTime: command.time,
            timerDuration: 30, // Default
            updatedAt: new Date(),
            scheduledBy: 'voice'
          }, { merge: true });
          alert(`Irrigation scheduled for ${command.date || 'today'} at ${command.time}`);
        }
        break;
      case 'get_status':
        alert(`Status: Temp ${latestData?.temperature}°C, Moisture ${latestData?.soilMoisture}%`);
        break;
      default:
        console.log('Unknown command action');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">Agro Sense</h1>
            <div className="flex items-center bg-green-50 px-3 py-1 rounded-full border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Live System</span>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            {latestData && (
              <div className="hidden md:block text-right">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Last Sync</p>
                <p className="text-sm font-mono text-gray-600">
                  {latestData.timestamp.toLocaleTimeString()}
                </p>
              </div>
            )}
            <div className="flex space-x-3">
              {sensorHistory.length === 0 && (
                  <button
                      onClick={seedData}
                      className="px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-md hover:bg-green-200"
                  >
                      Seed Data
                  </button>
              )}
              <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                  Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Live Sensor Readings */}
          {/* Alarm Notification */}
          {alarm && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-md flex items-center" role="alert">
              <Bell className="mr-3" />
              <p className="font-bold">{alarm}</p>
            </div>
          )}

          <h2 className="text-xl font-semibold text-gray-700 mb-4">Live Readings & Controls</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-10">
            <MotorControlCard isOn={isMotorOn} onToggle={handleMotorToggle} isLoading={isLoadingMotor} />
            <SensorCard icon={Thermometer} name="Temperature" value={latestData?.temperature ?? 'N/A'} unit="°C" />
            <SensorCard icon={Droplets} name="Humidity" value={latestData?.humidity ?? 'N/A'} unit="%" />
            <SensorCard icon={Waves} name="Soil Moisture" value={latestData?.soilMoisture ?? 'N/A'} unit="%" />
            <SensorCard icon={Sun} name="Light Level" value={latestData?.ldr ?? 'N/A'} unit="%" />
            <SensorCard icon={Container} name="Tank Level" value={(latestData as any)?.tankLevel ?? 'N/A'} unit="ml" />
            <VoiceAssistant onCommand={handleVoiceCommand} />
          </div>

          {/* Automation and History */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Automation />
            <div className="lg:col-span-2">
                <HistoryChart data={[...sensorHistory].reverse()} dataKey="temperature" name="Temperature" color="#ef4444" />
            </div>
             <div className="lg:col-span-2">
                <HistoryChart data={[...sensorHistory].reverse()} dataKey="humidity" name="Humidity" color="#3b82f6" />
            </div>
             <div className="lg:col-span-2">
                <HistoryChart data={[...sensorHistory].reverse()} dataKey="soilMoisture" name="Soil Moisture" color="#a16207" />
            </div>
             <div className="lg:col-span-2">
                <HistoryChart data={[...sensorHistory].reverse()} dataKey="ldr" name="Light Level" color="#f59e0b" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

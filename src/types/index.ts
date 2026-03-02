// src/types/index.ts

import { Timestamp } from 'firebase/firestore';

// Defines the structure for a single sensor reading document from Firestore.
export interface SensorData {
  id: string;
  timestamp: Timestamp;
  ultrasonic: number; // Distance in cm
  soilMoisture: number; // Percentage
  ldr: number; // Light intensity (lux)
  temperature: number; // Celsius
  humidity: number; // Percentage
}

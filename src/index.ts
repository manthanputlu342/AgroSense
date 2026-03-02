// src/types/index.ts

import { Timestamp } from 'firebase/firestore';

// Defines the structure for a single sensor reading document from Firestore.
export interface SensorData {
  id: string;
  timestamp: any; // Can be Firestore Timestamp or number (epoch)
  tankLevel: number; // Distance in cm
  soilMoisture: number; // Percentage
  ldr: number; // Light intensity (lux)
  temperature: number; // Celsius
  humidity: number; // Percentage
}

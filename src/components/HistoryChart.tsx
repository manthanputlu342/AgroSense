// src/components/HistoryChart.tsx

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { SensorData } from '../types';

interface HistoryChartProps {
  data: SensorData[];
  dataKey: keyof SensorData;
  name: string;
  color: string;
}

// A component to render a line chart for historical sensor data.
export default function HistoryChart({ data, dataKey, name, color }: HistoryChartProps) {
  // Format the timestamp for the X-axis labels.
  const formatXAxis = (tickItem: any) => {
    if (tickItem && tickItem.toDate) {
      return tickItem.toDate().toLocaleTimeString();
    }
    return '';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">{name} History</h3>
        <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" tickFormatter={formatXAxis} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey={dataKey} name={name} stroke={color} activeDot={{ r: 8 }} />
        </LineChart>
        </ResponsiveContainer>
    </div>
  );
}

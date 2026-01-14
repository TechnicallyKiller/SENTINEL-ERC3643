import { useEffect, useState } from 'react';

export default function ThreatMap() {
  const [pings, setPings] = useState<{id: number, x: number, y: number, color: string}[]>([]);

  // Simulate random "pings" across the map
  useEffect(() => {
    const interval = setInterval(() => {
      const newPing = {
        id: Date.now(),
        x: Math.random() * 100, // % width
        y: Math.random() * 100, // % height
        color: Math.random() > 0.8 ? 'bg-red-500' : 'bg-green-500' // Mostly safe, some danger
      };
      setPings(prev => [...prev.slice(-5), newPing]); // Keep last 5
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
      {/* Abstract World Grid */}
      <div className="absolute inset-0" 
           style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>
      
      {/* Pings */}
      {pings.map(ping => (
        <div 
          key={ping.id}
          className={`absolute w-3 h-3 rounded-full ${ping.color} animate-ping`}
          style={{ left: `${ping.x}%`, top: `${ping.y}%` }}
        />
      ))}
    </div>
  );
}
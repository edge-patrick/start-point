'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudRain, CloudLightning, Sun, CloudDrizzle, Loader2, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface WeatherData {
  temp: number;
  condition: string;
  conditionCode: number;
  forecast: { day: string; temp: number; conditionCode: number }[];
}

const getCondition = (code: number) => {
  if (code === 0) return { label: 'Clear', icon: Sun, color: 'text-yellow-400' };
  if (code <= 3) return { label: 'Cloudy', icon: Cloud, color: 'text-zinc-400' };
  if (code <= 48) return { label: 'Fog', icon: Cloud, color: 'text-zinc-500' };
  if (code <= 55) return { label: 'Drizzle', icon: CloudDrizzle, color: 'text-blue-300' };
  if (code <= 65) return { label: 'Rain', icon: CloudRain, color: 'text-blue-500' };
  if (code <= 77) return { label: 'Snow', icon: Cloud, color: 'text-white' };
  if (code <= 82) return { label: 'Showers', icon: CloudRain, color: 'text-blue-400' };
  return { label: 'Storm', icon: CloudLightning, color: 'text-purple-500' };
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,weathercode&timezone=auto`
        );
        const data = await response.json();

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const forecast = data.daily.time.slice(0, 7).map((time: string, i: number) => ({
          day: days[new Date(time).getDay()],
          temp: Math.round(data.daily.temperature_2m_max[i]),
          conditionCode: data.daily.weathercode[i],
        }));

        setWeather({
          temp: Math.round(data.current_weather.temperature),
          condition: getCondition(data.current_weather.weathercode).label,
          conditionCode: data.current_weather.weathercode,
          forecast,
        });
      } catch (err) {
        setError('Failed to fetch weather');
      } finally {
        setLoading(false);
      }
    };

    // Hardcoded location: Bratislava, Slovakia
    fetchWeather(48.1486, 17.1077);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md border border-white/20 dark:border-zinc-800/30 rounded-2xl p-6 shadow-xl">
        <Loader2 className="w-8 h-8 text-white/50 animate-spin" />
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md border border-white/20 dark:border-zinc-800/30 rounded-2xl p-6 shadow-xl text-white/50 text-sm">
        {error || 'Weather unavailable'}
      </div>
    );
  }

  const CurrentIcon = getCondition(weather.conditionCode).icon;
  const currentTheme = getCondition(weather.conditionCode);

  return (
    <div className="flex flex-col h-full bg-white/10 dark:bg-zinc-900/20 backdrop-blur-md border border-white/20 dark:border-zinc-800/30 rounded-2xl p-6 shadow-xl overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        {/* Left side: Label and Location */}
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Weather</h3>
          <div className="flex items-center gap-1.5 text-white/80 mt-0.5">
            <MapPin size={14} className="text-emerald-400" />
            <span className="text-xs font-black uppercase tracking-wider">Bratislava</span>
          </div>
        </div>

        {/* Right side: Temp, Condition, and Icon */}
        <div className="flex items-center gap-4 text-right">
          <span className="text-4xl font-black text-white leading-none">{weather.temp}°C</span>
          <div className="flex flex-col items-center justify-center">
            <CurrentIcon size={32} className={`${currentTheme.color} drop-shadow-lg`} />
            <span className="text-[10px] font-bold text-white/60 uppercase tracking-tighter mt-0.2">{weather.condition}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 mt-2 relative">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weather.forecast} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
              <XAxis 
                dataKey="day" 
                hide 
                padding={{ left: 15, right: 15 }}
              />
              <YAxis 
                hide 
                domain={['dataMin - 2', 'dataMax + 2']} 
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-zinc-900/90 border border-white/10 px-2 py-1 rounded text-[10px] font-bold text-white">
                        {payload[0].value}°C
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="temp" 
                stroke="#60a5fa" 
                strokeWidth={3} 
                dot={{ fill: '#60a5fa', r: 3, strokeWidth: 0 }}
                activeDot={{ r: 5, stroke: '#fff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="flex justify-between mt-2 px-[15px]">
        {weather.forecast.map((f, i) => {
          const ForecastIcon = getCondition(f.conditionCode).icon;
          const forecastTheme = getCondition(f.conditionCode);
          return (
            <div key={i} className="flex flex-col items-center gap-1">
              <span className="text-[8px] font-bold text-zinc-400 uppercase">{f.day}</span>
              <ForecastIcon size={12} className={`${forecastTheme.color} drop-shadow-sm`} />
              <span className="text-[10px] font-bold text-white">{f.temp}°</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

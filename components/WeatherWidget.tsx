'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { Cloud, CloudRain, CloudLightning, Sun, CloudDrizzle, Loader2, MapPin } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import {
  DEFAULT_WEATHER_CITY,
  WEATHER_CITY_CHANGE_EVENT,
  WEATHER_CITY_STORAGE_KEY,
} from '@/lib/settings';

interface WeatherData {
  location: string;
  temp: number;
  condition: string;
  conditionCode: number;
  forecast: { day: string; temp: number; conditionCode: number }[];
}

interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface GeocodingApiResponse {
  results?: WeatherLocation[];
}

interface WeatherApiResponse {
  current_weather: {
    temperature: number;
    weathercode: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    weathercode: number[];
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'number');

const isWeatherLocation = (value: unknown): value is WeatherLocation =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  typeof value.latitude === 'number' &&
  typeof value.longitude === 'number';

const isGeocodingApiResponse = (value: unknown): value is GeocodingApiResponse =>
  isRecord(value) &&
  (!('results' in value) ||
    (Array.isArray(value.results) && value.results.every(isWeatherLocation)));

const isWeatherApiResponse = (value: unknown): value is WeatherApiResponse => {
  if (!isRecord(value)) return false;
  const current = value.current_weather;
  const daily = value.daily;

  if (!isRecord(current) || !isRecord(daily)) return false;

  return (
    typeof current.temperature === 'number' &&
    typeof current.weathercode === 'number' &&
    isStringArray(daily.time) &&
    isNumberArray(daily.temperature_2m_max) &&
    isNumberArray(daily.weathercode)
  );
};

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

const normalizeWeatherCity = (city: string) => city.trim() || DEFAULT_WEATHER_CITY;

const getWeatherCitySnapshot = () => {
  if (typeof window === 'undefined') return DEFAULT_WEATHER_CITY;
  return normalizeWeatherCity(
    window.localStorage.getItem(WEATHER_CITY_STORAGE_KEY) ?? ''
  );
};

const subscribeToWeatherCity = (onStoreChange: () => void) => {
  window.addEventListener('storage', onStoreChange);
  window.addEventListener(WEATHER_CITY_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener('storage', onStoreChange);
    window.removeEventListener(WEATHER_CITY_CHANGE_EVENT, onStoreChange);
  };
};

export default function WeatherWidget() {
  const weatherCity = useSyncExternalStore(
    subscribeToWeatherCity,
    getWeatherCitySnapshot,
    () => DEFAULT_WEATHER_CITY
  );
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchLocation = async (city: string) => {
      const response = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
        { signal: controller.signal }
      );
      if (!response.ok) throw new Error('Failed to fetch location');

      const data: unknown = await response.json();
      if (!isGeocodingApiResponse(data) || !data.results?.[0]) {
        throw new Error('Location not found');
      }

      return data.results[0];
    };

    const fetchWeather = async (city: string) => {
      try {
        setLoading(true);
        setError(null);
        setWeather(null);

        const location = await fetchLocation(city);
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current_weather=true&daily=temperature_2m_max,weathercode&timezone=auto`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error('Failed to fetch weather');
        const data: unknown = await response.json();
        if (!isWeatherApiResponse(data)) throw new Error('Invalid weather payload');

        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const forecast = data.daily.time.slice(0, 7).map((time: string, i: number) => ({
          day: days[new Date(time).getDay()],
          temp: Math.round(data.daily.temperature_2m_max[i]),
          conditionCode: data.daily.weathercode[i],
        }));

        setWeather({
          location: location.name,
          temp: Math.round(data.current_weather.temperature),
          condition: getCondition(data.current_weather.weathercode).label,
          conditionCode: data.current_weather.weathercode,
          forecast,
        });
      } catch {
        if (controller.signal.aborted) return;
        setWeather(null);
        setError(`Weather unavailable for ${city}`);
      } finally {
        if (controller.signal.aborted) return;
        setLoading(false);
      }
    };

    fetchWeather(weatherCity);

    return () => controller.abort();
  }, [weatherCity]);

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
            <span className="text-xs font-black uppercase tracking-wider">{weather.location}</span>
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

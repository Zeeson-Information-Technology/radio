import RadioPlayer from "./RadioPlayer";
import type { Metadata } from "next";
import { logEnvironmentConfig } from "@/lib/utils/environment-checker";

export const metadata: Metadata = {
  title: "Listen Live",
  description: "Listen to live Islamic lectures and Quran recitations following the way of the Salaf.",
};

/**
 * Public Radio Page
 * Fetches live state and schedule from API and renders the radio player
 */
export default async function RadioPage() {
  // Log environment configuration for debugging
  logEnvironmentConfig();
  
  // Use absolute URL for server-side fetch
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : process.env.NODE_ENV === 'production' 
      ? 'https://almanhaj.vercel.app' // Replace with your actual Vercel URL
      : 'http://localhost:3000';

  console.log(`🔍 Using base URL for API calls: ${baseUrl}`);

  // Fetch live state from our API
  let liveData;
  
  try {
    console.log('🔍 Server-side fetching live data from:', `${baseUrl}/api/live`);
    const response = await fetch(`${baseUrl}/api/live`, {
      cache: 'no-store', // Always fetch fresh data
      next: { revalidate: 0 }, // Revalidate immediately
    });
    
    console.log('🔍 Live data response status:', response.status);
    
    if (response.ok) {
      liveData = await response.json();
      console.log('🔍 Live data fetched successfully:', liveData);
    } else {
      console.error('❌ Live data fetch failed with status:', response.status);
      throw new Error('Failed to fetch live data');
    }
  } catch (error) {
    console.error('❌ Error fetching live data:', error);
    // Fallback data
    liveData = {
      ok: true,
      isLive: false,
      isMuted: false,
      mutedAt: null,
      title: null,
      lecturer: null,
      startedAt: null,
      streamUrl: process.env.STREAM_URL || "http://localhost:8080/test-stream",
      currentAudioFile: null
    };
    console.log('🔍 Using fallback live data:', liveData);
  }

  // Fetch schedule data
  let scheduleData;
  
  try {
    console.log('🔍 Server-side fetching schedule data from:', `${baseUrl}/api/schedule`);
    const response = await fetch(`${baseUrl}/api/schedule`, {
      cache: 'no-store', // Always fetch fresh data
      next: { revalidate: 60 }, // Revalidate schedule every minute
    });
    
    console.log('🔍 Schedule data response status:', response.status);
    
    if (response.ok) {
      scheduleData = await response.json();
      console.log('🔍 Schedule data fetched successfully:', scheduleData);
    } else {
      console.error('❌ Schedule data fetch failed with status:', response.status);
      const errorText = await response.text();
      console.error('❌ Schedule error response:', errorText);
      throw new Error('Failed to fetch schedule');
    }
  } catch (error) {
    console.error('❌ Error fetching schedule:', error);
    // Fallback data
    scheduleData = {
      ok: true,
      items: [],
    };
    console.log('🔍 Using fallback schedule data:', scheduleData);
  }

  return <RadioPlayer initialData={liveData} scheduleData={scheduleData} />;
}

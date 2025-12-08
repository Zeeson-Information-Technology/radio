import RadioPlayer from "./RadioPlayer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Listen Live",
  description: "Listen to live Islamic lectures and Quran recitations following the way of the Salaf.",
};

/**
 * Public Radio Page
 * Fetches live state and schedule from API and renders the radio player
 */
export default async function RadioPage() {
  // Use absolute URL for server-side fetch
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}` 
    : 'http://localhost:3000';

  // Fetch live state from our API
  let liveData;
  
  try {
    const response = await fetch(`${baseUrl}/api/live`, {
      cache: 'no-store', // Always fetch fresh data
    });
    
    if (response.ok) {
      liveData = await response.json();
    } else {
      throw new Error('Failed to fetch live data');
    }
  } catch (error) {
    console.error('Error fetching live data:', error);
    // Fallback data
    liveData = {
      ok: true,
      isLive: false,
      title: "Offline",
      lecturer: null,
      startedAt: null,
      streamUrl: "https://example.com/stream",
    };
  }

  // Fetch schedule data
  let scheduleData;
  
  try {
    const response = await fetch(`${baseUrl}/api/schedule`, {
      cache: 'no-store', // Always fetch fresh data
    });
    
    if (response.ok) {
      scheduleData = await response.json();
    } else {
      throw new Error('Failed to fetch schedule');
    }
  } catch (error) {
    console.error('Error fetching schedule:', error);
    // Fallback data
    scheduleData = {
      ok: true,
      items: [],
    };
  }

  return <RadioPlayer initialData={liveData} scheduleData={scheduleData} />;
}

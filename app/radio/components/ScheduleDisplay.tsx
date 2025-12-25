'use client';

import { useState } from 'react';
import { ScheduleData, ScheduleItem } from '../types';
import { convertUTCToLocal, convertTimezoneToLocal, getUserTimezoneDisplay } from "@/lib/timezone";

interface ScheduleDisplayProps {
  scheduleData: ScheduleData;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Helper to convert 24h time string to 12h format
function convertTo12Hour(time24: string): string {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export default function ScheduleDisplay({ scheduleData }: ScheduleDisplayProps) {
  // State for collapsible sections
  const [isScheduleExpanded, setIsScheduleExpanded] = useState(true);
  const [expandedDays, setExpandedDays] = useState<Record<number, boolean>>({});

  // Toggle day expansion
  const toggleDay = (dayIndex: number) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayIndex]: !prev[dayIndex]
    }));
  };
  // Get next program
  const getNextProgram = (): ScheduleItem | null => {
    if (!scheduleData.items || scheduleData.items.length === 0) return null;
    
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    // Sort items by day and time
    const sortedItems = [...scheduleData.items].sort((a, b) => {
      if (a.dayOfWeek !== b.dayOfWeek) {
        return a.dayOfWeek - b.dayOfWeek;
      }
      const aTime = parseInt(a.startTime.split(':')[0]) * 60 + parseInt(a.startTime.split(':')[1]);
      const bTime = parseInt(b.startTime.split(':')[0]) * 60 + parseInt(b.startTime.split(':')[1]);
      return aTime - bTime;
    });
    
    // Find next program
    for (const item of sortedItems) {
      const itemTime = parseInt(item.startTime.split(':')[0]) * 60 + parseInt(item.startTime.split(':')[1]);
      
      if (item.dayOfWeek > currentDay || (item.dayOfWeek === currentDay && itemTime > currentTime)) {
        return item;
      }
    }
    
    // If no program found this week, return first program of next week
    return sortedItems[0] || null;
  };

  const nextProgram = getNextProgram();

  return (
    <div className="space-y-6">
      {/* Next Program Card */}
      {nextProgram && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-200 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-emerald-900">Next Program</h3>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-lg font-semibold text-emerald-800">{nextProgram.topic}</h4>
            <p className="text-emerald-700">with {nextProgram.lecturer}</p>
            <div className="flex items-center gap-4 text-sm text-emerald-600">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {DAYS[nextProgram.dayOfWeek]}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {convertTo12Hour(
                  nextProgram.timezone 
                    ? convertTimezoneToLocal(nextProgram.startTime, nextProgram.timezone)
                    : convertUTCToLocal(nextProgram.startTime)
                )}
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {nextProgram.durationMinutes} min
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 cursor-pointer hover:from-slate-700 hover:to-slate-800 transition-colors"
          onClick={() => setIsScheduleExpanded(!isScheduleExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-bold text-white">Weekly Schedule</h3>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-300 text-sm">
                Times shown in {getUserTimezoneDisplay()}
              </span>
              <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/20 hover:bg-white/20 transition-colors">
                <svg 
                  className={`w-4 h-4 text-white transition-transform duration-300 ${isScheduleExpanded ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {isScheduleExpanded && (
          <div className="p-6">
            {scheduleData.items && scheduleData.items.length > 0 ? (
              <div className="space-y-4">
                {DAYS.map((day, dayIndex) => {
                  const dayItems = scheduleData.items.filter(item => item.dayOfWeek === dayIndex);
                  const isDayExpanded = expandedDays[dayIndex] !== false; // Default to expanded
                  
                  return (
                    <div key={day} className="border-b border-slate-100 last:border-b-0 pb-4 last:pb-0">
                      <div 
                        className="flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-lg p-2 -m-2 transition-colors"
                        onClick={() => toggleDay(dayIndex)}
                      >
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-slate-800">{day}</h4>
                          {dayItems.length > 0 && (
                            <span className="bg-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">
                              {dayItems.length} program{dayItems.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        
                        {dayItems.length > 0 && (
                          <div className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center border border-slate-200 hover:bg-slate-200 transition-colors">
                            <svg 
                              className={`w-3 h-3 text-slate-600 transition-transform duration-300 ${isDayExpanded ? 'rotate-180' : ''}`} 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                              strokeWidth={3}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        )}
                      </div>
                      
                      {isDayExpanded && (
                        <div className="mt-3">
                          {dayItems.length > 0 ? (
                            <div className="space-y-2">
                              {dayItems
                                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                                .map((item) => (
                                  <div key={item._id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                                    <div className="flex-1">
                                      <h5 className="font-medium text-slate-800">{item.topic}</h5>
                                      <p className="text-sm text-slate-600">with {item.lecturer}</p>
                                    </div>
                                    
                                    <div className="text-right">
                                      <p className="font-medium text-slate-700">
                                        {convertTo12Hour(
                                          item.timezone 
                                            ? convertTimezoneToLocal(item.startTime, item.timezone)
                                            : convertUTCToLocal(item.startTime)
                                        )}
                                      </p>
                                      <p className="text-xs text-slate-500">{item.durationMinutes} min</p>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-slate-500 text-sm italic">No programs scheduled</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-600 font-medium">No schedule available</p>
                <p className="text-slate-500 text-sm">Check back later for upcoming programs</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
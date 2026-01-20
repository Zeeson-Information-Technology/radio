"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface LecturerOption {
  _id: string;
  name: string;
  recordingCount: number;
  isVerified: boolean;
}

interface LecturerComboBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export default function LecturerComboBox({
  value,
  onChange,
  placeholder = "Enter speaker name",
  required = false,
  className = ""
}: LecturerComboBoxProps) {
  const [lecturers, setLecturers] = useState<LecturerOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredLecturers, setFilteredLecturers] = useState<LecturerOption[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load lecturers from API
  const loadLecturers = useCallback(async () => {
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch('/api/lecturers');
      const data = await response.json();
      
      if (data.success) {
        setLecturers(data.lecturers || []);
      } else {
        setError("Failed to load lecturers");
        setLecturers([]); // Fallback to empty array
      }
    } catch (error) {
      console.error('Error loading lecturers:', error);
      setError("Network error loading lecturers");
      setLecturers([]); // Fallback to empty array
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load lecturers on component mount
  useEffect(() => {
    loadLecturers();
  }, [loadLecturers]);

  // Filter lecturers based on input value
  useEffect(() => {
    if (!value.trim()) {
      setFilteredLecturers(lecturers);
    } else {
      const filtered = lecturers.filter(lecturer =>
        lecturer.name.toLowerCase().includes(value.toLowerCase().trim())
      );
      setFilteredLecturers(filtered);
    }
    setSelectedIndex(-1); // Reset selection when filtering
  }, [value, lecturers]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Handle lecturer selection
  const handleLecturerSelect = (lecturer: LecturerOption) => {
    onChange(lecturer.name);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredLecturers.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredLecturers.length) {
          handleLecturerSelect(filteredLecturers[selectedIndex]);
        } else {
          // Allow creating new lecturer by pressing Enter
          setIsOpen(false);
        }
        break;
      
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if current value matches an existing lecturer
  const exactMatch = lecturers.find(l => 
    l.name.toLowerCase().trim() === value.toLowerCase().trim()
  );
  const isNewLecturer = value.trim() && !exactMatch;

  return (
    <div className="relative">
      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          className={`w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${className}`}
          placeholder={placeholder}
          required={required}
          autoComplete="off"
        />
        
        {/* Dropdown Arrow */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          <svg 
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              Loading lecturers...
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500 text-sm">
              {error}
              <button
                type="button"
                onClick={loadLecturers}
                className="block mx-auto mt-2 text-xs text-emerald-600 hover:text-emerald-700"
              >
                Try again
              </button>
            </div>
          ) : filteredLecturers.length === 0 && !value.trim() ? (
            <div className="p-4 text-center text-slate-500 text-sm">
              No lecturers found. Start typing to create a new one.
            </div>
          ) : (
            <>
              {/* Existing Lecturers */}
              {filteredLecturers.map((lecturer, index) => (
                <button
                  key={lecturer._id}
                  type="button"
                  onClick={() => handleLecturerSelect(lecturer)}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between group ${
                    index === selectedIndex ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-800 truncate">
                        {lecturer.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {lecturer.recordingCount} recording{lecturer.recordingCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {lecturer.isVerified && (
                      <div className="text-emerald-600 text-sm" title="Verified lecturer">
                        ✓
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {/* Create New Option */}
              {isNewLecturer && (
                <div className="border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      setSelectedIndex(-1);
                    }}
                    className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center gap-3 ${
                      selectedIndex === filteredLecturers.length ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                    }`}
                  >
                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 text-sm">
                      +
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">
                        Create new: "{value.trim()}"
                      </div>
                      <div className="text-xs text-slate-500">
                        Add as new lecturer
                      </div>
                    </div>
                  </button>
                </div>
              )}

              {/* No Results */}
              {filteredLecturers.length === 0 && value.trim() && !isNewLecturer && (
                <div className="p-4 text-center text-slate-500 text-sm">
                  No lecturers found matching "{value.trim()}"
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/lib/contexts/ToastContext";

interface Presenter {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AudioFile {
  id: string;
  title: string;
  visibility: 'private' | 'shared' | 'public';
  sharedWith: string[];
}

interface AudioSharingModalProps {
  audioFile: AudioFile;
  isOpen: boolean;
  onClose: () => void;
  onSharingUpdated: (audioId: string, visibility: string, sharedWith: string[]) => void;
}

export default function AudioSharingModal({ 
  audioFile, 
  isOpen, 
  onClose, 
  onSharingUpdated 
}: AudioSharingModalProps) {
  const [visibility, setVisibility] = useState<'private' | 'shared' | 'public'>(audioFile.visibility);
  const [selectedPresenters, setSelectedPresenters] = useState<string[]>(audioFile.sharedWith);
  const [availablePresenters, setAvailablePresenters] = useState<Presenter[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { showSuccess, showError } = useToast();

  // Load available presenters
  useEffect(() => {
    if (isOpen) {
      loadPresenters();
      setVisibility(audioFile.visibility);
      setSelectedPresenters(audioFile.sharedWith);
    }
  }, [isOpen, audioFile]);

  const loadPresenters = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/presenters');
      if (response.ok) {
        const data = await response.json();
        setAvailablePresenters(data.presenters || []);
      }
    } catch (error) {
      console.error('Failed to load presenters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePresenterToggle = (presenterId: string) => {
    setSelectedPresenters(prev => 
      prev.includes(presenterId)
        ? prev.filter(id => id !== presenterId)
        : [...prev, presenterId]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/audio/${audioFile.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility,
          presenterIds: visibility === 'shared' ? selectedPresenters : []
        })
      });

      if (response.ok) {
        const data = await response.json();
        onSharingUpdated(audioFile.id, data.visibility, data.sharedWith);
        showSuccess('Sharing Updated', 'Audio sharing settings updated successfully');
        onClose();
      } else {
        const error = await response.json();
        showError('Update Failed', `Failed to update sharing: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to update sharing:', error);
      showError('Update Failed', 'Failed to update sharing settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Share Audio File</h2>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-slate-600 mt-2 truncate" title={audioFile.title}>
            {audioFile.title}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Visibility Options */}
          <div>
            <label className="block text-sm font-semibold text-slate-800 mb-3">
              Who can access this audio?
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={(e) => setVisibility(e.target.value as 'private')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium text-slate-800">🔒 Private</div>
                  <div className="text-sm text-slate-600">Only you can access this audio</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="shared"
                  checked={visibility === 'shared'}
                  onChange={(e) => setVisibility(e.target.value as 'shared')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium text-slate-800">🤝 Shared</div>
                  <div className="text-sm text-slate-600">Share with specific presenters</div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={(e) => setVisibility(e.target.value as 'public')}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <div className="font-medium text-slate-800">🌍 Public</div>
                  <div className="text-sm text-slate-600">Available to all presenters</div>
                </div>
              </label>
            </div>
          </div>

          {/* Presenter Selection (only for shared visibility) */}
          {visibility === 'shared' && (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-3">
                Select presenters to share with:
              </label>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="ml-2 text-slate-600">Loading presenters...</span>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                  {availablePresenters.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                      No other presenters available
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {availablePresenters.map((presenter) => (
                        <label
                          key={presenter._id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedPresenters.includes(presenter._id)}
                            onChange={() => handlePresenterToggle(presenter._id)}
                            className="text-emerald-600 focus:ring-emerald-500 rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-slate-800 truncate">
                              {presenter.name}
                            </div>
                            <div className="text-sm text-slate-600 truncate">
                              {presenter.email} • {presenter.role}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {selectedPresenters.length > 0 && (
                <div className="mt-2 text-sm text-slate-600">
                  Selected: {selectedPresenters.length} presenter{selectedPresenters.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || (visibility === 'shared' && selectedPresenters.length === 0)}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
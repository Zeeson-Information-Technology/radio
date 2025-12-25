"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import { useModal } from "@/lib/contexts/ModalContext";
import { useToast } from "@/lib/contexts/ToastContext";

interface AudioFile {
  id: string;
  title: string;
  description?: string;
  lecturerName: string;
  category: {
    name: string;
    icon?: string;
    color?: string;
  };
  duration: number;
  fileSize: number;
  url: string;
  visibility: 'private' | 'shared' | 'public';
  sharedWith: string[];
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  broadcastReady: boolean;
  broadcastUsageCount: number;
  createdAt: string;
  isFavorite: boolean;
  isOwner: boolean;
  type?: string;
  year?: number;
  tags?: string[];
}

interface EditAudioModalProps {
  audioFile: AudioFile;
  onSave: (updatedFile: Partial<AudioFile>) => void;
  apiEndpoint?: string;
  isLiveAudio?: boolean;
}

export default function EditAudioModal({ 
  audioFile, 
  onSave, 
  apiEndpoint = '/api/audio/recordings',
  isLiveAudio = false 
}: EditAudioModalProps) {
  const { closeModal } = useModal();
  const { showSuccess, showError } = useToast();
  const [formData, setFormData] = useState({
    title: '',
    lecturerName: '',
    type: 'lecture',
    year: new Date().getFullYear(),
    description: '',
    tags: '',
    broadcastReady: false
  });
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (audioFile) {
      setFormData({
        title: audioFile.title || '',
        lecturerName: audioFile.lecturerName || '',
        type: audioFile.type || 'lecture',
        year: audioFile.year || new Date().getFullYear(),
        description: audioFile.description || '',
        tags: audioFile.tags ? audioFile.tags.join(', ') : '',
        broadcastReady: audioFile.broadcastReady || false
      });
    }
  }, [audioFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const updatedData = {
        title: formData.title.trim(),
        lecturerName: formData.lecturerName.trim(),
        type: formData.type,
        year: formData.year,
        description: formData.description.trim(),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        ...(isLiveAudio && { broadcastReady: formData.broadcastReady })
      };

      const response = await fetch(apiEndpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updatedData,
          id: audioFile.id
        })
      });

      if (response.ok) {
        onSave(updatedData);
        showSuccess('Audio Updated', 'Audio file updated successfully');
        closeModal();
      } else {
        const error = await response.json();
        showError('Update Failed', error.message || 'Failed to update audio');
      }
    } catch (error) {
      console.error('Error updating audio:', error);
      showError('Update Failed', 'Failed to update audio');
    } finally {
      setIsLoading(false);
    }
  };

  const themeColor = isLiveAudio ? 'blue' : 'emerald';

  return (
    <Modal maxWidth="5xl" showCloseButton={false}>
      {/* Header */}
      <div className={`flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r rounded-t-2xl ${
        isLiveAudio ? 'from-blue-50 to-emerald-50' : 'from-emerald-50 to-blue-50'
      }`}>
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {isLiveAudio ? 'Edit Broadcast Audio' : 'Edit Audio Recording'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {isLiveAudio ? 'Update live broadcast audio information' : 'Update the recording information'}
          </p>
        </div>
        <button
          onClick={() => closeModal()}
          disabled={isLoading}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          type="button"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Title *
            </label>
            <input
              type="text"
              id="title"
              required
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
              placeholder="Enter the audio title"
            />
          </div>

          {/* Speaker/Lecturer */}
          <div>
            <label htmlFor="lecturer" className="block text-sm font-medium text-gray-700 mb-2">
              Speaker/Lecturer *
            </label>
            <input
              type="text"
              id="lecturer"
              required
              value={formData.lecturerName}
              onChange={(e) => setFormData(prev => ({ ...prev, lecturerName: e.target.value }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
              placeholder="Enter speaker name"
            />
          </div>

          {/* Content Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Content Type *
            </label>
            <select
              id="type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
            >
              <option value="lecture">📚 Lecture</option>
              <option value="quran">📖 Quran Recitation</option>
              <option value="hadith">📜 Hadith</option>
              <option value="tafsir">📝 Tafsir</option>
              <option value="adhkar">🤲 Adhkar & Dhikr</option>
              <option value="qa">❓ Q&A Session</option>
            </select>
          </div>

          {/* Year */}
          <div>
            <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
              Year (Optional)
            </label>
            <input
              type="number"
              id="year"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={formData.year}
              onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || new Date().getFullYear() }))}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
            />
          </div>
        </div>

        {/* Description */}
        <div className="lg:col-span-3 mt-6">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
            placeholder="Brief description of the audio content"
          />
        </div>

        {/* Tags */}
        <div className="lg:col-span-3 mt-6">
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            Tags (Optional)
          </label>
          <input
            type="text"
            id="tags"
            value={formData.tags}
            onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-${themeColor}-500 focus:border-${themeColor}-500`}
            placeholder="Enter tags separated by commas (e.g., ramadan, prayer, youth)"
          />
          <p className="text-xs text-gray-500 mt-1">Separate multiple tags with commas</p>
        </div>

        {/* Broadcast Ready Toggle - Only for live audio */}
        {isLiveAudio && (
          <div className="lg:col-span-3 mt-6">
            <label className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                checked={formData.broadcastReady}
                onChange={(e) => setFormData(prev => ({ ...prev, broadcastReady: e.target.checked }))}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-blue-900">📡 Broadcast Ready</div>
                <div className="text-sm text-blue-700">Make this audio available for live broadcast injection</div>
              </div>
            </label>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4 mt-8 pt-6 border-t border-gray-100">
          <button
            type="button"
            onClick={closeModal}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className={`flex-1 px-6 py-3 bg-gradient-to-r from-${themeColor}-600 to-${themeColor}-700 text-white rounded-lg hover:from-${themeColor}-700 hover:to-${themeColor}-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </span>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
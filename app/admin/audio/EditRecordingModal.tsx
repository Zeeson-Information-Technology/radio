"use client";

import { useState } from "react";
import Modal from "./Modal";

interface AudioRecording {
  _id: string;
  title: string;
  description?: string;
  lecturerName: string;
  type: "quran" | "hadith" | "tafsir" | "lecture" | "dua";
  tags: string[];
  year?: number;
}

interface EditRecordingModalProps {
  recording: AudioRecording;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedRecording: Partial<AudioRecording>) => void;
}

export default function EditRecordingModal({ 
  recording, 
  isOpen, 
  onClose, 
  onSave 
}: EditRecordingModalProps) {
  const [title, setTitle] = useState(recording.title);
  const [description, setDescription] = useState(recording.description || "");
  const [lecturerName, setLecturerName] = useState(recording.lecturerName);
  const [type, setType] = useState(recording.type);
  const [tags, setTags] = useState(recording.tags.join(", "));
  const [year, setYear] = useState(recording.year?.toString() || "");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedData = {
        title: title.trim(),
        description: description.trim() || undefined,
        lecturerName: lecturerName.trim(),
        type,
        tags: tags.split(",").map(tag => tag.trim()).filter(tag => tag),
        year: year ? parseInt(year) : undefined
      };

      await onSave(updatedData);
      onClose();
    } catch (error) {
      console.error("Error saving:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Audio Recording</h1>
            <p className="text-sm text-slate-600 mt-1">Update the recording information</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-lg hover:bg-slate-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8 max-h-[70vh] overflow-y-auto">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter the audio title"
                  />
                </div>

                {/* Lecturer Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Speaker/Lecturer *
                  </label>
                  <input
                    type="text"
                    value={lecturerName}
                    onChange={(e) => setLecturerName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter speaker name"
                  />
                </div>

                {/* Content Type */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Content Type *
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="lecture">📚 Lecture</option>
                    <option value="quran">📖 Quran Recitation</option>
                    <option value="hadith">📜 Hadith</option>
                    <option value="tafsir">📝 Tafsir</option>
                    <option value="dua">🤲 Dua</option>
                  </select>
                </div>

                {/* Year */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Year (Optional)
                  </label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="e.g., 2024"
                    min="1400"
                    max={new Date().getFullYear() + 1}
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Description (Optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Brief description of the audio content"
                  />
                </div>

                {/* Tags */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tags (Optional)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="Enter tags separated by commas (e.g., ramadan, prayer, youth)"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Separate multiple tags with commas
                  </p>
                </div>
              </div>
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 rounded-b-2xl">
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !lecturerName.trim()}
            className="flex-1 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
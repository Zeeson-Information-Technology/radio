"use client";

export default function SupportedFormats() {
  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 className="font-medium text-blue-900 mb-3">📁 File Requirements</h3>
      
      {/* Essential Info Only */}
      <div className="space-y-3 text-sm">
        <div>
          <span className="font-medium text-slate-700">Formats:</span>
          <span className="ml-2 text-slate-600">MP3, M4A, WAV, AMR, FLAC</span>
        </div>
        
        <div>
          <span className="font-medium text-slate-700">Max Size:</span>
          <span className="ml-2 text-slate-600">20MB</span>
        </div>
        
        <div>
          <span className="font-medium text-slate-700">Recommended:</span>
          <span className="ml-2 text-slate-600">MP3 96kbps for lectures</span>
        </div>
        
        <div className="bg-amber-50 border border-amber-200 rounded p-2">
          <span className="font-medium text-amber-800">📱 Mobile Formats:</span>
          <span className="ml-2 text-amber-700 text-xs">AMR/3GP files can be uploaded but require download for playback. Use MP3/M4A for web playback.</span>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs">
        <div className="font-medium text-amber-800 mb-1">💡 Quick Tips</div>
        <div className="text-amber-700 space-y-1">
          <div>• 20-min lecture: Use MP3 96kbps (~14MB)</div>
          <div>• Voice recordings: Use AMR or MP3 64kbps</div>
          <div>• WhatsApp voice notes (AMR) are supported</div>
        </div>
      </div>
    </div>
  );
}
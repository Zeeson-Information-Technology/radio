"use client";

export default function SupportedFormats() {
  return (
    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
      <h3 className="font-medium text-blue-900 mb-3">📁 File Requirements</h3>
      
      {/* Essential Info */}
      <div className="space-y-3 text-sm">
        <div>
          <span className="font-medium text-slate-700">Supported Formats:</span>
          <span className="ml-2 text-slate-600">MP3, MPEG, M4A, WAV, AMR, FLAC, OGG, WEBM, WMA, 3GP</span>
        </div>
        
        <div>
          <span className="font-medium text-slate-700">Max Size:</span>
          <span className="ml-2 text-slate-600">30MB</span>
        </div>      
        
        <div className="bg-slate-50 border border-slate-200 rounded p-2">
          <span className="font-medium text-slate-700">💡 Pro Tip:</span>
          <span className="ml-2 text-slate-600 text-xs">For fastest uploads, use MP3 at 96-128kbps for speech content.</span>
        </div>
      </div>
    </div>
  );
}
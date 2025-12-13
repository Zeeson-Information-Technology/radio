# FFmpeg Setup for Audio Conversion

Al-Manhaj Radio supports automatic conversion of AMR and other audio formats to MP3 for better web compatibility. This requires FFmpeg to be installed on your system.

## Why FFmpeg?

- **AMR files** (common from WhatsApp voice notes) don't play in most browsers
- **3GP files** from mobile recordings have limited support
- **WMA files** from Windows systems aren't web-compatible
- FFmpeg automatically converts these to MP3 during upload

## Installation

### Windows (Recommended)

1. **Download FFmpeg:**
   - Go to https://ffmpeg.org/download.html
   - Click "Windows" → "Windows builds by BtbN"
   - Download the latest release (ffmpeg-master-latest-win64-gpl.zip)

2. **Install FFmpeg:**
   ```bash
   # Extract to C:\ffmpeg
   # Add C:\ffmpeg\bin to your PATH environment variable
   ```

3. **Verify Installation:**
   ```bash
   ffmpeg -version
   ```

### Alternative: Chocolatey (Windows)
```bash
# Install Chocolatey first: https://chocolatey.org/install
choco install ffmpeg
```

### Alternative: Scoop (Windows)
```bash
# Install Scoop first: https://scoop.sh/
scoop install ffmpeg
```

### macOS
```bash
# Using Homebrew
brew install ffmpeg
```

### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install ffmpeg
```

## Verification

After installation, restart your development server and try uploading an AMR file. You should see:

```
✅ FFmpeg is available
🔄 Converting AMR to MP3...
✅ Successfully converted AMR to MP3
```

## Without FFmpeg

If FFmpeg is not installed:
- AMR/3GP/WMA files will still be accepted
- They'll be stored as-is but may not play in browsers
- Users will see a warning: "⚠️ This format may not play in all browsers"
- Recommend users to use MP3, M4A, or WAV formats instead

## Troubleshooting

### "FFmpeg not found" Error
1. Ensure FFmpeg is in your system PATH
2. Restart your terminal/IDE
3. Restart the development server (`npm run dev`)

### Conversion Fails
- Check file isn't corrupted
- Ensure sufficient disk space
- Try converting manually: `ffmpeg -i input.amr output.mp3`

### Performance
- Conversion adds 2-5 seconds to upload time
- Larger files take longer to convert
- Consider pre-converting files for faster uploads

## File Size Impact

| Original Format | Typical Size | After MP3 Conversion |
|----------------|--------------|---------------------|
| AMR (voice)    | 1-2MB/min    | 0.7-1MB/min        |
| 3GP (mobile)   | 2-3MB/min    | 0.7-1MB/min        |
| WMA (Windows)  | 3-5MB/min    | 0.7-1MB/min        |

Conversion typically reduces file size while improving compatibility.
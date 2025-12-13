#!/bin/bash

# FFmpeg Installation Script for EC2 (Ubuntu/Amazon Linux)
# This script installs FFmpeg for audio conversion support

set -e  # Exit on any error

echo "🎵 Installing FFmpeg for audio conversion..."

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VER=$VERSION_ID
else
    echo "❌ Cannot detect OS. This script supports Ubuntu and Amazon Linux."
    exit 1
fi

echo "📋 Detected OS: $OS $VER"

# Install FFmpeg based on OS
if [[ "$OS" == *"Ubuntu"* ]]; then
    echo "🔧 Installing FFmpeg on Ubuntu..."
    
    # Update package list
    sudo apt-get update
    
    # Install FFmpeg
    sudo apt-get install -y ffmpeg
    
elif [[ "$OS" == *"Amazon Linux"* ]]; then
    echo "🔧 Installing FFmpeg on Amazon Linux..."
    
    # Enable EPEL repository for additional packages
    sudo yum install -y epel-release
    
    # Install FFmpeg
    sudo yum install -y ffmpeg ffmpeg-devel
    
else
    echo "❌ Unsupported OS: $OS"
    echo "This script supports Ubuntu and Amazon Linux only."
    exit 1
fi

# Verify installation
echo "✅ Verifying FFmpeg installation..."

if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n 1)
    echo "✅ FFmpeg installed successfully: $FFMPEG_VERSION"
else
    echo "❌ FFmpeg installation failed"
    exit 1
fi

if command -v ffprobe &> /dev/null; then
    FFPROBE_VERSION=$(ffprobe -version | head -n 1)
    echo "✅ FFprobe installed successfully: $FFPROBE_VERSION"
else
    echo "❌ FFprobe installation failed"
    exit 1
fi

# Test basic conversion functionality
echo "🧪 Testing FFmpeg conversion capability..."

# Create a test audio file (1 second of silence)
TEST_INPUT="/tmp/test_input.wav"
TEST_OUTPUT="/tmp/test_output.mp3"

# Generate 1 second of silence as WAV
ffmpeg -f lavfi -i "anullsrc=channel_layout=mono:sample_rate=22050" -t 1 -y "$TEST_INPUT" 2>/dev/null

if [ -f "$TEST_INPUT" ]; then
    echo "✅ Test input file created"
    
    # Convert to MP3
    ffmpeg -i "$TEST_INPUT" -codec:a libmp3lame -b:a 64k -ar 22050 -ac 1 -y "$TEST_OUTPUT" 2>/dev/null
    
    if [ -f "$TEST_OUTPUT" ]; then
        echo "✅ Test conversion successful"
        
        # Get file info
        OUTPUT_SIZE=$(stat -c%s "$TEST_OUTPUT" 2>/dev/null || stat -f%z "$TEST_OUTPUT" 2>/dev/null)
        echo "✅ Test MP3 file size: $OUTPUT_SIZE bytes"
        
        # Clean up test files
        rm -f "$TEST_INPUT" "$TEST_OUTPUT"
        echo "✅ Test files cleaned up"
    else
        echo "❌ Test conversion failed"
        rm -f "$TEST_INPUT"
        exit 1
    fi
else
    echo "❌ Failed to create test input file"
    exit 1
fi

# Create temp directory for audio conversion
TEMP_DIR="/tmp/audio-conversion"
if [ ! -d "$TEMP_DIR" ]; then
    mkdir -p "$TEMP_DIR"
    echo "✅ Created temp directory: $TEMP_DIR"
fi

# Set permissions for Node.js process
chmod 755 "$TEMP_DIR"

echo ""
echo "🎉 FFmpeg installation completed successfully!"
echo ""
echo "📋 Installation Summary:"
echo "   - FFmpeg: $(ffmpeg -version | head -n 1 | cut -d' ' -f3)"
echo "   - FFprobe: $(ffprobe -version | head -n 1 | cut -d' ' -f3)"
echo "   - Temp directory: $TEMP_DIR"
echo ""
echo "🚀 Your system is now ready for audio conversion!"
echo "   - AMR files will be automatically converted to MP3"
echo "   - Conversion optimized for voice recordings (64kbps, mono)"
echo "   - Temp files will be automatically cleaned up"
echo ""
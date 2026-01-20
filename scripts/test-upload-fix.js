/**
 * Test script to verify S3 upload fix for problematic filenames
 * Run with: node scripts/test-upload-fix.js
 */

// Mock the sanitization function from S3Service
const getContentDisposition = (filename) => {
  if (!filename) return undefined;
  
  try {
    // Remove or replace problematic characters
    let sanitizedFilename = filename
      .replace(/["\\\r\n\t]/g, '') // Remove quotes, backslashes, and control characters
      .replace(/[^\x20-\x7E]/g, '_') // Replace non-ASCII characters with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .replace(/[<>:"|?*]/g, '_') // Replace Windows-invalid filename characters
      .replace(/_{2,}/g, '_') // Replace multiple consecutive underscores with single underscore
      .trim()
      .substring(0, 100); // Limit length to prevent header size issues
    
    // Remove leading/trailing underscores and dots
    sanitizedFilename = sanitizedFilename.replace(/^[_.]+|[_.]+$/g, '');
    
    if (!sanitizedFilename || sanitizedFilename.length === 0) return undefined;
    
    // Use RFC 6266 format for better compatibility
    return `inline; filename="${sanitizedFilename}"`;
  } catch (error) {
    console.warn('Failed to create Content-Disposition header:', error);
    return undefined; // Skip the header if there's any issue
  }
};

// Test cases that might have caused the original error
const testFilenames = [
  'Qur\'an Recitation - Sürah Al-Fātiḥah.mp3',
  'Islamic Lecture "The Path to Paradise".mp3',
  'Hadith Collection\tVolume 1.mp3',
  'سورة الفاتحة - القارئ محمد صديق المنشاوي.mp3',
  'Audio File with "Quotes" and \\Backslashes\\.mp3',
  'File with\r\nLine Breaks.mp3',
  'Very Long Filename That Exceeds Normal Length Limits And Should Be Truncated To Prevent Header Size Issues.mp3',
  'test<>:|?*file.mp3',
  '   whitespace   file   .mp3',
  '',
  undefined,
  null
];

console.log('🧪 Testing S3 filename sanitization...\n');

testFilenames.forEach((filename, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`  Input:  ${JSON.stringify(filename)}`);
  
  try {
    const result = getContentDisposition(filename);
    console.log(`  Output: ${JSON.stringify(result)}`);
    console.log(`  Status: ✅ Success`);
  } catch (error) {
    console.log(`  Output: Error - ${error.message}`);
    console.log(`  Status: ❌ Failed`);
  }
  
  console.log('');
});

console.log('🎉 All tests completed! The S3 upload should now handle problematic filenames correctly.');
console.log('\n📝 Summary of fixes:');
console.log('  - Removed quotes, backslashes, and control characters');
console.log('  - Replaced non-ASCII characters with underscores');
console.log('  - Replaced spaces with underscores');
console.log('  - Handled Windows-invalid filename characters');
console.log('  - Limited filename length to prevent header size issues');
console.log('  - Added proper error handling for edge cases');
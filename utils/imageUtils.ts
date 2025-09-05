// Utility functions for image compression and resizing

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  maxSizeKB?: number; // Maximum file size in KB
  preserveDetails?: boolean; // For AI recognition, maintain higher quality
}

// Detect if device has low memory and needs aggressive compression
export function isLowMemoryDevice(): boolean {
  // Check if navigator.deviceMemory is available (Chrome/Edge)
  if ('deviceMemory' in navigator) {
    return (navigator as any).deviceMemory <= 2; // 2GB or less
  }
  
  // Fallback: check user agent for low-end devices
  const userAgent = navigator.userAgent.toLowerCase();
  const isLowEndAndroid = userAgent.includes('android') && 
    (userAgent.includes('sm-a') || userAgent.includes('sm-j') || userAgent.includes('go'));
  
  return isLowEndAndroid;
}

// Get optimal compression settings based on device capabilities
function getCompressionSettings(fileSize: number): CompressOptions {
  const isLowMemory = isLowMemoryDevice();
  const fileSizeMB = fileSize / (1024 * 1024);
  
  if (isLowMemory) {
    // Aggressive compression for low-memory devices
    return {
      maxWidth: fileSizeMB > 5 ? 1280 : 1600,
      maxHeight: fileSizeMB > 5 ? 720 : 900,
      quality: 0.75, // Still good enough for AI
      maxSizeKB: 400, // Very small files
      preserveDetails: false
    };
  } else {
    // Balanced compression for normal devices
    return {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.85, // Higher quality for better AI recognition
      maxSizeKB: 800,
      preserveDetails: true
    };
  }
}

export async function compressImage(
  file: File, 
  options: CompressOptions = {}
): Promise<File> {
  // Get optimal settings based on device and file size
  const optimalSettings = getCompressionSettings(file.size);
  
  const {
    maxWidth = optimalSettings.maxWidth,
    maxHeight = optimalSettings.maxHeight,
    quality = optimalSettings.quality,
    maxSizeKB = optimalSettings.maxSizeKB,
    preserveDetails = optimalSettings.preserveDetails
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      try {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = calculateDimensions(
          img.width, 
          img.height, 
          maxWidth, 
          maxHeight
        );

        canvas.width = width;
        canvas.height = height;

        // Draw and compress the image
        ctx!.drawImage(img, 0, 0, width, height);

        // Convert to blob with compression
        canvas.toBlob(async (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          // Check if we need further compression
          let finalBlob = blob;
          let currentQuality = quality;
          
          // For AI recognition, be more conservative with quality reduction
          const minQuality = preserveDetails ? 0.6 : 0.3;
          const qualityStep = preserveDetails ? 0.05 : 0.1;

          // If still too large, reduce quality iteratively
          while (finalBlob.size > maxSizeKB * 1024 && currentQuality > minQuality) {
            currentQuality -= qualityStep;
            const qualityToUse = Math.max(currentQuality, minQuality);
            
            await new Promise<void>((resolveCompress) => {
              canvas.toBlob((newBlob) => {
                if (newBlob) {
                  finalBlob = newBlob;
                }
                resolveCompress();
              }, 'image/jpeg', qualityToUse);
            });
            
            // Break if we've reached minimum quality
            if (qualityToUse === minQuality) break;
          }

          // Create a new File object with the compressed blob
          const compressedFile = new File(
            [finalBlob], 
            file.name.replace(/\.[^/.]+$/, '.jpg'), // Change extension to .jpg
            { 
              type: 'image/jpeg',
              lastModified: Date.now()
            }
          );

          console.log(`Image compressed: ${(file.size / 1024).toFixed(1)}KB → ${(compressedFile.size / 1024).toFixed(1)}KB`);
          resolve(compressedFile);

        }, 'image/jpeg', quality);

      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function calculateDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  let width = originalWidth;
  let height = originalHeight;

  // Calculate the scaling factor
  const widthRatio = maxWidth / width;
  const heightRatio = maxHeight / height;
  const ratio = Math.min(widthRatio, heightRatio);

  // Only scale down, never scale up
  if (ratio < 1) {
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  return { width, height };
}

export async function compressMultipleImages(
  files: File[],
  options?: CompressOptions
): Promise<File[]> {
  const compressPromises = files.map(file => {
    // Only compress image files
    if (!file.type.startsWith('image/')) {
      return Promise.resolve(file);
    }
    
    return compressImage(file, options);
  });

  return Promise.all(compressPromises);
}

// Check if image compression is needed based on file size
export function shouldCompressImage(file: File, maxSizeKB: number = 800): boolean {
  return file.type.startsWith('image/') && (file.size / 1024) > maxSizeKB;
}

// Emergency compression for extremely low-memory devices
export async function emergencyCompress(file: File): Promise<File> {
  console.warn('[ImageUtils] Using emergency compression for low-memory device');
  
  return compressImage(file, {
    maxWidth: 800,  // Very small dimensions
    maxHeight: 600,
    quality: 0.6,   // Lower quality but still usable for AI
    maxSizeKB: 200, // Very small file size
    preserveDetails: false
  });
}

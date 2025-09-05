// Utility functions for image compression and resizing

interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 to 1.0
  maxSizeKB?: number; // Maximum file size in KB
}

export async function compressImage(
  file: File, 
  options: CompressOptions = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    maxSizeKB = 800
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

          // If still too large, reduce quality iteratively
          while (finalBlob.size > maxSizeKB * 1024 && currentQuality > 0.1) {
            currentQuality -= 0.1;
            const qualityToUse = currentQuality;
            
            await new Promise<void>((resolveCompress) => {
              canvas.toBlob((newBlob) => {
                if (newBlob) {
                  finalBlob = newBlob;
                }
                resolveCompress();
              }, 'image/jpeg', qualityToUse);
            });
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

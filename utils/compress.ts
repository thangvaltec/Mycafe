
/**
 * Compresses an image file by resizing it and reducing quality.
 * @param file The original image file.
 * @param maxWidth Max width/height. Default 1200.
 * @param quality JPEG quality (0 to 1). Default 0.8.
 * @returns Promise<File> The compressed file.
 */
export const compressImage = (file: File, maxWidth = 1200, quality = 0.8): Promise<File> => {
    return new Promise((resolve, reject) => {
        // If not an image, return original
        if (!file.type.match(/image.*/)) {
            resolve(file);
            return;
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                // Calculate new dimensions
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxWidth) {
                        width = Math.round((width * maxWidth) / height);
                        height = maxWidth;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    // Fallback if canvas fails
                    resolve(file);
                    return;
                }

                ctx.fillStyle = 'white'; // Fill transparent background (for PNG->JPEG)
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        resolve(file);
                        return;
                    }
                    // Create new file with same name but likely smaller size
                    // Convert PNG to JPEG usually saves space for photos
                    const newFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                        type: 'image/jpeg',
                        lastModified: Date.now(),
                    });

                    // Only return compressed if it's actually smaller
                    if (newFile.size < file.size) {
                        resolve(newFile);
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

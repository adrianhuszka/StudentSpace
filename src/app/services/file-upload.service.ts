import { Injectable, inject } from '@angular/core';
import { NzMessageService } from 'ng-zorro-antd/message';

export interface FileUploadOptions {
  maxSizeMB?: number;
  allowedTypes?: string[];
  compress?: boolean;
  maxDimension?: number;
  quality?: number;
}

@Injectable({
  providedIn: 'root',
})
export class FileUploadService {
  private message = inject(NzMessageService);

  /**
   * Handle image file selection and convert to base64 with optional compression
   */
  async handleImageFile(file: File, options: FileUploadOptions = {}): Promise<string | null> {
    const {
      maxSizeMB = 5,
      allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
      compress = true,
      maxDimension = 1200,
      quality = 0.8,
    } = options;

    // Validate file type
    if (!allowedTypes.some((type) => file.type.includes(type.replace('image/', '')))) {
      this.message.error('Please select a valid image file');
      return null;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      this.message.error(`Image size should not exceed ${maxSizeMB}MB`);
      return null;
    }

    try {
      if (compress) {
        return await this.compressImage(file, maxDimension, quality);
      } else {
        return await this.fileToBase64(file);
      }
    } catch (error) {
      this.message.error('Failed to process image file');
      return null;
    }
  }

  /**
   * Handle PDF file selection
   */
  handlePdfFile(
    file: File,
    options: FileUploadOptions = {}
  ): { valid: boolean; file: File | null } {
    const { maxSizeMB = 10 } = options;

    // Validate file type
    if (!file.type.includes('pdf')) {
      this.message.error('Please select a PDF file');
      return { valid: false, file: null };
    }

    // Validate file size
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      this.message.error(`File size must be less than ${maxSizeMB}MB`);
      return { valid: false, file: null };
    }

    this.message.success('File selected successfully');
    return { valid: true, file };
  }

  /**
   * Convert file to base64 string
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Compress image and convert to base64
   */
  private compressImage(
    file: File,
    maxDimension: number = 1200,
    quality: number = 0.8
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }

          // Calculate new dimensions (maintain aspect ratio)
          let width = img.width;
          let height = img.height;

          if (width > height && width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64
          const outputQuality = file.type === 'image/png' ? 0.9 : quality;
          const base64String = canvas.toDataURL(file.type, outputQuality);

          resolve(base64String);
        };
        img.onerror = reject;
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get image source for display (handles both base64 and URLs)
   */
  getImageSrc(image: string): string {
    if (!image) return '';
    // If it's already a base64 string or full URL, return as is
    if (image.startsWith('data:') || image.startsWith('http')) {
      return image;
    }
    // Otherwise assume it's a relative path
    return image;
  }
}

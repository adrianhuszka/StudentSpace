import {
  Component,
  Inject,
  PLATFORM_ID,
  inject,
  OnInit,
  ChangeDetectorRef,
  signal,
  computed,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Router } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzMessageService } from 'ng-zorro-antd/message';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from '@services/auth-service';
import { AvatarComponent } from '@components/avatar/avatar.component';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';

export interface Profession {
  id: number;
  name: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-home',
  imports: [
    CommonModule,
    NzIconModule,
    NzLayoutModule,
    NzMenuModule,
    AvatarComponent,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzUploadModule,
    ReactiveFormsModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  protected readonly date = new Date();
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private apiUrl = environment.apiUrl;
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);

  szakmak: Profession[] = [];

  // Edit mode state
  isEditMode = signal(false);
  isModalVisible = signal(false);
  isEditing = signal(false);
  professionForm!: FormGroup;
  selectedProfessionId: number | null = null;

  // Check if user is admin
  isAdmin = computed(() => {
    const roles = this.authService.userRoles();
    return roles.includes('ADMIN') || roles.includes('SUPERADMIN');
  });

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.initForm();
  }

  ngOnInit() {
    this.loadProfessions();
  }

  private initForm() {
    this.professionForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      image: [''], // Will store base64 string - optional
    });
  }

  /**
   * Handle file selection and convert to base64 with compression
   */
  handleFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.message.error('Please select a valid image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.message.error('Image size should not exceed 5MB');
        return;
      }

      // Compress and convert to base64
      this.compressImage(file)
        .then((base64String) => {
          this.professionForm.patchValue({
            image: base64String,
          });
          this.cdr.markForCheck();
        })
        .catch(() => {
          this.message.error('Failed to process image file');
        });
    }
  }

  /**
   * Compress image and convert to base64
   */
  private compressImage(file: File): Promise<string> {
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

          // Calculate new dimensions (max 1200px width/height, maintain aspect ratio)
          let width = img.width;
          let height = img.height;
          const maxSize = 1200;

          if (width > height && width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with 0.8 quality for JPEG, 0.9 for PNG
          const quality = file.type === 'image/png' ? 0.9 : 0.8;
          const base64String = canvas.toDataURL(file.type, quality);

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

  toggleEditMode() {
    this.isEditMode.update((v) => !v);
  }

  openAddModal() {
    this.isEditing.set(false);
    this.selectedProfessionId = null;
    this.professionForm.reset();
    this.isModalVisible.set(true);
  }

  openEditModal(profession: Profession) {
    this.isEditing.set(true);
    this.selectedProfessionId = profession.id;
    this.professionForm.patchValue({
      name: profession.name,
      description: profession.description,
      image: profession.image, // Will be base64 from backend
    });
    this.isModalVisible.set(true);
  }

  /**
   * Clear the selected image
   */
  clearImage(): void {
    this.professionForm.patchValue({
      image: '',
    });
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  handleCancel() {
    this.isModalVisible.set(false);
    this.professionForm.reset();
    this.selectedProfessionId = null;
  }

  handleSubmit() {
    if (this.professionForm.invalid) {
      Object.values(this.professionForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const professionData = this.professionForm.value;

    if (this.isEditing()) {
      this.updateProfession(professionData);
    } else {
      this.addProfession(professionData);
    }
  }

  private addProfession(data: Partial<Profession>) {
    this.http
      .post(`${this.apiUrl}/professions`, data, {
        observe: 'response',
        responseType: 'text',
      })
      .subscribe({
        next: (response) => {
          console.log('Add response:', response);
          console.log('Add response status:', response.status);
          console.log('Add response body:', response.body);
          this.message.success('Profession added successfully!');
          // Backend returns plain text ID, so reload professions to get the updated list
          this.loadProfessions();
          this.handleCancel();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error adding profession - Full error object:', error);
          console.error('Error status:', error.status);
          console.error('Error message:', error.message);
          console.error('Error error:', error.error);
          this.message.error('Failed to add profession. Please try again.');
        },
      });
  }

  private updateProfession(data: Partial<Profession>) {
    if (!this.selectedProfessionId) return;

    const professionData = {
      ...data,
      id: this.selectedProfessionId,
    };

    this.http
      .put(`${this.apiUrl}/professions`, professionData, {
        observe: 'response',
        responseType: 'text',
      })
      .subscribe({
        next: (response) => {
          console.log('Update response:', response);
          const index = this.szakmak.findIndex((p) => p.id === this.selectedProfessionId);
          if (index !== -1) {
            // Update with local data since backend returns plain text ID
            this.szakmak[index] = { ...this.szakmak[index], ...professionData };
          }
          this.handleCancel();
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('Error updating profession - Full error object:', error);
          this.message.error('Failed to update profession. Please try again.');
        },
      });
  }

  deleteProfession(id: number, event: Event) {
    event.stopPropagation();

    if (!confirm('Are you sure you want to delete this profession?')) {
      return;
    }

    this.http.delete(`${this.apiUrl}/professions/${id}`).subscribe({
      next: () => {
        this.message.success('Profession deleted successfully!');
        this.szakmak = this.szakmak.filter((p) => p.id !== id);
        // Adjust current index if needed
        if (this.currentIndex >= this.szakmak.length) {
          this.currentIndex = Math.max(0, this.szakmak.length - 1);
        }
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error deleting profession:', error);
        this.message.error('Failed to delete profession. Please try again.');
      },
    });
  }

  private loadProfessions() {
    this.http.get<Profession[]>(`${this.apiUrl}/professions`).subscribe({
      next: (data) => {
        console.log('Professions loaded:', data);
        if (data && data.length > 0) {
          this.szakmak = data;
          this.cdr.markForCheck(); // Explicitly trigger change detection
        }
      },
      error: (error) => {
        console.error('Error loading professions:', error);
      },
    });
  }

  navigateToProfession(id: number) {
    this.router.navigate(['/selected-profession', id]);
  }
  currentIndex = 0;

  nextCard() {
    this.currentIndex = (this.currentIndex + 1) % this.szakmak.length;
  }

  prevCard() {
    this.currentIndex = (this.currentIndex - 1 + this.szakmak.length) % this.szakmak.length;
  }

  getCardPosition(index: number): number {
    let diff = index - this.currentIndex;

    // Normalize the difference to be within [-length/2, length/2]
    if (diff > this.szakmak.length / 2) {
      diff -= this.szakmak.length;
    } else if (diff < -this.szakmak.length / 2) {
      diff += this.szakmak.length;
    }

    if (diff === 0) return 0; // center
    if (diff === 1) return 1; // right
    if (diff === -1) return -1; // left
    return 2; // hidden
  }

  getCardTransform(position: number): string {
    const isMobile = this.isBrowser ? window.innerWidth < 768 : false;

    if (position === 0) {
      return 'translateX(0) scale(1)';
    } else if (position === 1) {
      return isMobile ? 'translateX(15%) scale(0.85)' : 'translateX(60%) scale(0.85)';
    } else if (position === -1) {
      return isMobile ? 'translateX(-15%) scale(0.85)' : 'translateX(-60%) scale(0.85)';
    } else {
      return 'translateX(0) scale(0.7)';
    }
  }

  getCardOpacity(position: number): string {
    if (position === 0) return '1';
    if (position === 2) return '0';
    return this.isBrowser && window.innerWidth < 768 ? '0.4' : '0.75';
  }
}

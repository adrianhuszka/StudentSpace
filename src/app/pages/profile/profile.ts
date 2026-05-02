import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@services/auth-service';
import { environment } from 'src/environments/environment';
import { Router } from '@angular/router';

import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSpinModule } from 'ng-zorro-antd/spin';

interface UserProfile {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  omCode?: string;
  roles: string[];
}

@Component({
  selector: 'app-profile',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzIconModule,
    NzCardModule,
    NzAvatarModule,
    NzDividerModule,
    NzSpinModule,
  ],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  userProfile = signal<UserProfile | null>(null);
  isLoading = signal(true);
  isEditMode = signal(false);
  isChangingPassword = signal(false);

  ngOnInit() {
    this.initForms();
    this.loadUserProfile();
  }

  private initForms() {
    this.profileForm = this.fb.group({
      username: [{ value: '', disabled: true }],
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      omCode: [''],
    });

    this.passwordForm = this.fb.group(
      {
        currentPassword: ['', [Validators.required]],
        newPassword: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', [Validators.required]],
      },
      { validators: this.passwordMatchValidator },
    );
  }

  private passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordMismatch: true };
  }

  private loadUserProfile() {
    this.isLoading.set(true);
    const user = this.authService.getUser();

    if (!user) {
      this.message.error('User not found');
      this.router.navigate(['/login']);
      return;
    }

    this.http.get<UserProfile>(`${this.apiUrl}/users/me`).subscribe({
      next: (profile) => {
        this.userProfile.set(profile);
        this.profileForm.patchValue({
          username: profile.username,
          fullName: profile.fullName || '',
          email: profile.email || '',
          omCode: profile.omCode || '',
        });
        this.isLoading.set(false);
      },
      error: (error) => {
        console.error('Error loading profile:', error);

        this.userProfile.set({
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          roles: user.roles,
        });
        this.profileForm.patchValue({
          username: user.username,
          fullName: user.fullName,
        });
        this.isLoading.set(false);
      },
    });
  }

  toggleEditMode() {
    this.isEditMode.update((v) => !v);
    if (!this.isEditMode()) {
      this.loadUserProfile();
    }
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      Object.values(this.profileForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const profileData = {
      id: this.userProfile()!.id,
      fullName: this.profileForm.get('fullName')?.value,
      email: this.profileForm.get('email')?.value,
      omCode: this.profileForm.get('omCode')?.value,
      username: this.profileForm.get('username')?.value,
      roles: this.userProfile()!.roles,
    };

    this.http
      .put(`${this.apiUrl}/users`, profileData, {
        responseType: 'text',
      })
      .subscribe({
        next: (response) => {
          this.message.success('Profile updated successfully!');
          this.isEditMode.set(false);
          this.loadUserProfile();
        },
        error: (error) => {
          console.error('Error updating profile:', error);
          this.message.error('Failed to update profile. Please try again.');
        },
      });
  }

  togglePasswordChange() {
    this.isChangingPassword.update((v) => !v);
    if (!this.isChangingPassword()) {
      this.passwordForm.reset();
    }
  }

  changePassword() {
    if (this.passwordForm.invalid) {
      Object.values(this.passwordForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const passwordData = {
      oldPassword: this.passwordForm.get('currentPassword')?.value,
      newPassword: this.passwordForm.get('newPassword')?.value,
      confirmPassword: this.passwordForm.get('confirmPassword')?.value,
      userId: this.userProfile()!.id,
    };

    this.http
      .put(`${this.apiUrl}/users/change-password`, passwordData, {
        responseType: 'text',
      })
      .subscribe({
        next: (response) => {
          this.message.success('Password changed successfully!');
          this.passwordForm.reset();
          this.isChangingPassword.set(false);
        },
        error: (error) => {
          console.error('Error changing password:', error);
          this.message.error('Failed to change password. Please check your current password.');
        },
      });
  }

  getInitials(): string {
    const profile = this.userProfile();
    if (profile && profile.fullName)
      return profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);

    return profile?.username?.substring(0, 2).toUpperCase() || '?';
  }

  getRoleBadgeColor(role: string): string {
    const roleColors: { [key: string]: string } = {
      SUPERADMIN: '#f5222d',
      ADMIN: '#fa8c16',
      TEACHER: '#52c41a',
      STUDENT: '#1890ff',
    };
    return roleColors[role] || '#d9d9d9';
  }

  navigateBack() {
    this.router.navigate(['/home']);
  }
}

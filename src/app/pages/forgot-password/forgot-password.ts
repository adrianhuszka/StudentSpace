import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthService } from '@services/auth-service';

@Component({
  selector: 'app-forgot-password',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    NzButtonModule,
    NzFormModule,
    NzInputModule,
    NzAlertModule,
  ],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private fb = inject(NonNullableFormBuilder);
  private authService = inject(AuthService);

  isSubmitting = signal(false);
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);

  forgotPasswordForm = this.fb.group({
    email: this.fb.control('', [Validators.required, Validators.email]),
  });

  async submitForm(): Promise<void> {
    if (this.forgotPasswordForm.valid) {
      const { email } = this.forgotPasswordForm.getRawValue();
      this.isSubmitting.set(true);
      this.successMessage.set(null);
      this.errorMessage.set(null);

      const result = await this.authService.forgotPassword(email);

      if (result.success) {
        this.successMessage.set(result.message);
      } else {
        this.errorMessage.set(result.message);
      }

      this.isSubmitting.set(false);
    } else {
      Object.values(this.forgotPasswordForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }
}

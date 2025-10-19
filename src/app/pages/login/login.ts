import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { AuthService } from '@services/auth-service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzFormModule,
    NzInputModule,
    NzAlertModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(NonNullableFormBuilder);
  private router = inject(Router);

  constructor(public authService: AuthService) {}

  validateForm = this.fb.group({
    username: this.fb.control('', [Validators.required]),
    password: this.fb.control('', [Validators.required]),
    remember: this.fb.control(true),
  });

  getPasswordErrorMessage(): string {
    const passwordControl = this.validateForm.controls.password;
    console.log(passwordControl);
    if (passwordControl.hasError('required')) {
      return 'Password is required';
    }
    if (passwordControl.hasError('pattern')) {
      return 'Password must be at least 8 characters with uppercase, lowercase, and number';
    }
    return 'aa';
  }

  getUsernameErrorMessage(): string {
    const usernameControl = this.validateForm.controls.username;
    if (usernameControl.hasError('required')) {
      return 'Username is required';
    }
    return '';
  }

  submitForm(): void {
    if (this.validateForm.valid) {
      const { username, password } = this.validateForm.value;

      // Call the async login method
      this.authService.login(username!, password!).then((success) => {
        if (success) {
          // Redirect to home or dashboard after successful login
          this.router.navigate(['/']);
        }
        // Error message is already set in authService.errorMessage
      });
    } else {
      Object.values(this.validateForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
  }

  log(str: any): void {
    console.log(str);
  }
}

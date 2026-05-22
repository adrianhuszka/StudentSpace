import { Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { AuthService } from '@services/auth-service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterModule,
    NzButtonModule,
    NzCheckboxModule,
    NzFormModule,
    NzInputModule,
    NzAlertModule,
    NzTabsModule,
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

  registerForm = this.fb.group({
    username: this.fb.control('', [Validators.required]),
    email: this.fb.control('', [Validators.required, Validators.email]),
    password: this.fb.control('', [Validators.required]),
    confirmPassword: this.fb.control('', [Validators.required]),
  });

  getPasswordErrorMessage(): string {
    const passwordControl = this.validateForm.controls.password;
    if (passwordControl.hasError('required')) {
      return 'A jelszó megadása kötelező';
    }
    if (passwordControl.hasError('pattern')) {
      return 'A jelszónak legalább 8 karakteresnek kell lennie, kis- és nagybetűvel, valamint számmal';
    }
    return 'aa';
  }

  getUsernameErrorMessage(): string {
    const usernameControl = this.validateForm.controls.username;
    if (usernameControl.hasError('required')) {
      return 'A felhasználónév megadása kötelező';
    }
    return '';
  }

  submitForm(): void {
    if (this.validateForm.valid) {
      const { username, password } = this.validateForm.value;

      this.authService.login(username!, password!).then((success) => {
        if (success) {
          this.router.navigate(['/']);
        }
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

  onKeycloakLogin(): void {
    this.authService.loginWithKeycloak();
  }

  submitRegisterForm(): void {
    if (this.registerForm.invalid) {
      Object.values(this.registerForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const { username, email, password, confirmPassword } = this.registerForm.getRawValue();

    if (password !== confirmPassword) {
      this.authService.errorMessage.set('A két jelszó nem egyezik meg.');
      return;
    }

    this.authService.register(username, email, password).then((success) => {
      if (success) {
        this.router.navigate(['/']);
      }
    });
  }
}

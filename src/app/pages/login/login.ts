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

  getPasswordErrorMessage(): string {
    const passwordControl = this.validateForm.controls.password;
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
}

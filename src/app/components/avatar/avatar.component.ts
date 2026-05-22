import { Component } from '@angular/core';

import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { AuthService } from '@services/auth-service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-avatar',
  imports: [NzBadgeModule, NzAvatarModule, NzIconModule, NzDropDownModule, RouterLink],
  templateUrl: './avatar.component.html',
  styleUrls: ['./avatar.component.scss'],
})
export class AvatarComponent {
  isNewMessage: boolean = false;
  userName: string = 'John Doe';
  isAdmin: boolean = false;

  constructor(private authService: AuthService) {
    this.userName = this.authService.getUser()?.username ?? 'Vendég';
    this.isAdmin =
      this.authService.getUser()?.roles.some((role) => role === 'ADMIN' || role === 'SUPERADMIN') ??
      false;
  }

  log(data: string): void {
    console.log(data);
  }

  logout() {
    this.authService.logout();
    location.reload();
  }
}

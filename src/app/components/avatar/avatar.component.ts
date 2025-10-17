import { Component } from '@angular/core';

import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';

@Component({
  selector: 'app-avatar',
  imports: [NzBadgeModule, NzAvatarModule, NzIconModule, NzDropDownModule],
  templateUrl: './avatar.component.html',
})
export class AvatarComponent {
  isNewMessage: boolean = false;
  userName: string = 'John Doe';

  log(data: string): void {
    console.log(data);
  }
}

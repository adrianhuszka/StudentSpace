import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-selected-profession',
  imports: [NzLayoutModule, NzMenuModule, AvatarComponent, NzBreadCrumbModule, NzIconModule],
  templateUrl: './selected-profession.html',
  styleUrl: './selected-profession.scss',
})
export class SelectedProfession {
  profession: string = 'Profession Details Here';
  protected readonly date = new Date();
  isCollapsed = false;

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe((params) => {
      const id = params['id'];
      console.log(id);
    });
  }
}

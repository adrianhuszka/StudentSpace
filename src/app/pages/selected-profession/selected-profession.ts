import { Component, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@services/auth-service';
import { environment } from 'src/environments/environment';
import { Profession } from '@pages/home/home';
import { MarkdownModule } from 'ngx-markdown';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

interface Subject {
  id: number;
  name: string;
  description: string;
  professions: Profession[];
  module: Module[];
}

interface Module {
  id: string;
  title: string;
  content: string | File;
  moduleType: 'MD' | 'PDF';
}

@Component({
  selector: 'app-selected-profession',
  imports: [
    NzLayoutModule,
    NzMenuModule,
    AvatarComponent,
    NzBreadCrumbModule,
    NzIconModule,
    MarkdownModule,
    NzSpinModule,
  ],
  templateUrl: './selected-profession.html',
  styleUrl: './selected-profession.scss',
})
export class SelectedProfession {
  protected readonly date = new Date();
  isCollapsed = false;
  private apiUrl = environment.apiUrl;

  professionSubjects = signal<Subject[]>([]);
  selectedProfession = signal<Profession | null>(null);
  selectedModule = signal<Module | null>(null);

  isLoading = signal(true);
  loadError = signal<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.route.params.subscribe((params) => {
      this.loadData(params['id']);
    });
  }

  private loadData(professionId: string): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    const subjects$ = this.http.get<Subject[]>(
      `${this.apiUrl}/subjects/by-profession/${professionId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const profession$ = this.http.get<Profession>(`${this.apiUrl}/professions/${professionId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    forkJoin({
      subjects: subjects$,
      profession: profession$,
    })
      .pipe(
        finalize(() => {
          console.log('Finalize called - setting isLoading to false');
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (result) => {
          console.log('Data loaded successfully:', result);

          result.subjects.sort((a, b) => {
            const [aTitle, aNum] = a.name.split(' - ');
            const [bTitle, bNum] = b.name.split(' - ');

            if (aTitle !== bTitle) {
              return aTitle.localeCompare(bTitle, 'hu');
            }

            return parseInt(aNum) - parseInt(bNum);
          });

          this.professionSubjects.set(result.subjects);
          this.selectedProfession.set(result.profession);
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.loadError.set('Failed to load profession data. Please try again.');
        },
      });
  }

  selectModule(module: Module) {
    this.selectedModule.set(module);
    console.log('Selected module:', module);
    console.log('Module content type:', typeof module.content);
    console.log('Module content:', module.content);
  }

  /**
   * Get the content as a string for markdown rendering
   */
  get markdownContent(): string | undefined {
    const module = this.selectedModule();
    if (!module?.content) {
      return undefined;
    }

    // If content is a File, we would need to read it (not implemented here)
    // For now, we assume content is always a string for MD type
    return typeof module.content === 'string' ? module.content : undefined;
  }
}

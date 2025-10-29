import { Component, Inject, PLATFORM_ID, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Router } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { AuthService } from '@services/auth-service';
import { AvatarComponent } from '@components/avatar/avatar.component';

export interface Profession {
  id: number;
  name: string;
  description: string;
  image: string;
}

@Component({
  selector: 'app-home',
  imports: [CommonModule, NzIconModule, NzLayoutModule, NzMenuModule, AvatarComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit {
  protected readonly date = new Date();
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private apiUrl = environment.apiUrl;
  szakmak: Profession[] = [];

  constructor(
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadProfessions();
  }

  private loadProfessions() {
    this.http
      .get<Profession[]>(`${this.apiUrl}/professions`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + this.authService.getToken() || '',
        },
      })
      .subscribe({
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

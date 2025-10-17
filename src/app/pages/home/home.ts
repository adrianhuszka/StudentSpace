import { Component, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Router } from '@angular/router';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';

@Component({
  selector: 'app-home',
  imports: [CommonModule, NzIconModule, NzLayoutModule, NzMenuModule],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  protected readonly date = new Date();
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor(private router: Router) {}

  navigateToProfession(id: number) {
    this.router.navigate(['/selected-profession', id]);
  }
  currentIndex = 0;

  szakmak = [
    {
      id: 1,
      name: 'Informatikai rendszerüzemeltető',
      description: 'Hálózatok, szerverek, üzemeltetés',
      imageUrl: '/rendszeruzemelteto.jpg',
    },
    {
      id: 2,
      name: 'Szoftverfejlesztő és tesztelő',
      description: 'Szoftverfejlesztés, tesztelés',
      imageUrl: '/szoftver.jpg',
    },
    {
      id: 3,
      name: 'Elektronika és Elektrotechnika',
      description: 'Áramkörök, digitális technika',
      imageUrl: '/elektro.jpg',
    },
    {
      id: 4,
      name: 'Automatikai technikus',
      description: 'Ipar, robotika, automatizálás',
      imageUrl: '/automatikaiTechnikus.jpg',
    },
    {
      id: 5,
      name: 'Távközlési technikus',
      description: 'Hálózatok, távközlés, rendszerek',
      imageUrl: '/tavkozlesi.jpg',
    },
  ];

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

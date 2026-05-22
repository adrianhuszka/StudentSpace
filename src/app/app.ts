import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '@services/auth-service';
import { ChatbotComponent } from '@components/chatbot/chatbot.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, ChatbotComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  authService = inject(AuthService);
  private router = inject(Router);
  private readonly hiddenChatRoutes = ['/login', '/register', '/forgot-password', '/admin'];

  shouldShowChatbot() {
    const currentPath = this.router.url.split('?')[0];
    return !this.hiddenChatRoutes.some((route) => currentPath.startsWith(route));
  }
}

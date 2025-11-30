import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
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
}

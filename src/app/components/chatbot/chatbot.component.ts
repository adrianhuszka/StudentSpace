import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { ChatbotService, SearchIndexItem } from '@services/chatbot.service';
import { MarkdownModule } from 'ngx-markdown';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  quote?: string;
  page?: number;
  module?: SearchIndexItem;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzInputModule,
    NzIconModule,
    NzSpinModule,
    MarkdownModule,
  ],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.scss',
})
export class ChatbotComponent {
  private chatbotService = inject(ChatbotService);

  isOpen = signal(false);
  isLoading = signal(false);
  messages = signal<ChatMessage[]>([
    { sender: 'bot', text: 'Szia! Miben segíthetek ma? Kérdezz bátran a tananyagokból!' },
  ]);
  userInput = signal('');

  toggleChat() {
    this.isOpen.update((v) => !v);
    // Index content when opened if not already indexed
    if (this.isOpen()) {
      this.chatbotService.indexContent();
    }
  }

  async sendMessage() {
    const text = this.userInput().trim();
    if (!text) return;

    // Add user message
    this.messages.update((msgs) => [...msgs, { sender: 'user', text }]);
    this.userInput.set('');
    this.isLoading.set(true);

    try {
      const response = await this.chatbotService.findAnswer(text);

      this.messages.update((msgs) => [
        ...msgs,
        {
          sender: 'bot',
          text: response.answer,
          quote: response.quote,
          page: response.page,
          module: response.module,
        },
      ]);
    } catch (e) {
      this.messages.update((msgs) => [
        ...msgs,
        { sender: 'bot', text: 'Sajnálom, hiba történt a válaszadás közben.' },
      ]);
    } finally {
      this.isLoading.set(false);
    }
  }

  goToSource(msg: ChatMessage) {
    if (msg.module) {
      this.chatbotService.navigateToModule(msg.module, msg.quote, msg.page);
      this.isOpen.set(false); // Close chat on navigation
    }
  }
}

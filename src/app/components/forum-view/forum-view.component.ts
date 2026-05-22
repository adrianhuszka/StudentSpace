import {
  Component,
  inject,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
  WritableSignal,
} from '@angular/core';
import { Profession } from '@pages/home/home';
import { Forum, Subject } from '@pages/selected-profession/selected-profession';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@services/auth-service';

import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-forum-view',
  templateUrl: './forum-view.html',
  styleUrls: ['./forum-view.scss'],
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzButtonModule,
    NzTooltipModule,
    NzInputModule,
  ],
})
export class ForumViewComponent implements OnChanges {
  @Input() selectedProfession!: WritableSignal<Profession | null>;
  @Input() professionSubjects!: WritableSignal<Subject[]>;
  @Input() initialSubjectId: number | null = null;
  @Output() closeForumView = new EventEmitter<void>();

  newMessageContent = '';
  editingMessageId: string | null = null;
  editingMessageContent = '';

  private apiUrl = environment.apiUrl;
  selectedForum = signal<Forum | null>(null);
  selectedSubject = signal<Subject | null>(null);

  private http = inject(HttpClient);
  private message = inject(NzMessageService);
  private authService = inject(AuthService);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialSubjectId'] || changes['professionSubjects']) {
      this.trySelectInitialForum();
    }
  }

  private trySelectInitialForum() {
    if (!this.initialSubjectId || this.selectedForum()) {
      return;
    }

    const subject = this.professionSubjects().find(
      (item) => item.id === this.initialSubjectId && item.forum,
    );

    if (subject) {
      this.selectForumId(subject);
    }
  }

  /**
   * Close the forum view
   */
  onCloseForumView() {
    this.closeForumView.emit();
  }

  selectForumId(subject: Subject) {
    this.selectedSubject.set(subject);
    const forumId = subject.forum?.id;
    this.http.get<Forum>(`${this.apiUrl}/forum/${forumId}`).subscribe((forum) => {
      this.selectedForum.set(forum);
      console.log('Selected forum:', forum);
    });
  }

  /**
   * Check if a message is from the current user
   */
  isCurrentUserMessage(message: any): boolean {
    const currentUser = this.authService.getUser();
    return currentUser?.username === message.author?.username;
  }

  /**
   * Check if a message is currently being edited
   */
  isEditing(messageId: string): boolean {
    return this.editingMessageId === messageId;
  }

  /**
   * Start editing a message
   */
  startEditMessage(message: any) {
    this.editingMessageId = message.id;
    this.editingMessageContent = message.message;
  }

  /**
   * Cancel editing a message
   */
  cancelEditMessage() {
    this.editingMessageId = null;
    this.editingMessageContent = '';
  }

  /**
   * Save edited message
   */
  saveEditMessage(messageId: string) {
    if (!this.editingMessageContent.trim()) {
      this.message.error('Az üzenet nem lehet üres');
      return;
    }

    const updateData = {
      id: messageId,
      message: this.editingMessageContent.trim(),
    };

    this.http
      .put(`${this.apiUrl}/forum-messages`, updateData, {
        responseType: 'text',
      })
      .subscribe({
        next: (response) => {
          console.log('Message updated successfully:', response);
          this.message.success('Az üzenet sikeresen frissítve!');
          this.cancelEditMessage();

          const forumId = this.selectedForum()!.id;
          this.refreshForum(forumId);
        },
        error: (error) => {
          console.error('Error updating message:', error);
          this.message.error('Nem sikerült frissíteni az üzenetet. Próbáld újra.');
        },
      });
  }

  /**
   * Handle keydown event in textarea
   * Enter: Send message
   * Shift+Enter: New line
   */
  onTextareaKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Handle keydown event in edit textarea
   */
  onEditTextareaKeydown(event: KeyboardEvent, messageId: string) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.saveEditMessage(messageId);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelEditMessage();
    }
  }

  sendMessage() {
    if (!this.selectedForum()) {
      this.message.error('Nincs kiválasztott fórum');
      return;
    }

    if (!this.newMessageContent.trim()) {
      this.message.error('Küldés előtt írj be egy üzenetet');
      return;
    }

    const forumId = this.selectedForum()!.id;
    const messageData = {
      message: this.newMessageContent.trim(),
      forumId: forumId,
    };

    this.http
      .post(`${this.apiUrl}/forum-messages`, messageData, {
        responseType: 'text',
      })
      .subscribe({
        next: (response) => {
          console.log('Message sent successfully:', response);
          this.message.success('Az üzenet sikeresen elküldve!');
          this.newMessageContent = '';

          this.refreshForum(forumId);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.message.error('Nem sikerült elküldeni az üzenetet. Próbáld újra.');
        },
      });
  }

  private refreshForum(forumId: string) {
    this.http.get<Forum>(`${this.apiUrl}/forum/${forumId}`).subscribe({
      next: (forum) => {
        this.selectedForum.set(forum);
      },
      error: (error) => {
        console.error('Error refreshing forum:', error);
      },
    });
  }
}

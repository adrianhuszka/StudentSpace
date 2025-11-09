import { Component, inject, Input, signal, WritableSignal } from '@angular/core';
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
export class ForumViewComponent {
  @Input() selectedProfession!: WritableSignal<Profession | null>;
  @Input() professionSubjects!: WritableSignal<Subject[]>;
  @Input() closeForumView!: () => void;

  newMessageContent = '';
  private apiUrl = environment.apiUrl;
  selectedForum = signal<Forum | null>(null);
  selectedSubject = signal<Subject | null>(null);

  private http = inject(HttpClient);
  private message = inject(NzMessageService);

  selectForumId(subject: Subject) {
    this.selectedSubject.set(subject);
    const forumId = subject.forum?.id;
    this.http.get<Forum>(`${this.apiUrl}/forum/${forumId}`).subscribe((forum) => {
      this.selectedForum.set(forum);
    });
  }

  sendMessage() {
    if (!this.selectedForum()) {
      this.message.error('No forum selected');
      return;
    }

    if (!this.newMessageContent.trim()) {
      this.message.error('Please enter a message before sending');
      return;
    }

    console.log('Sending message:', this.newMessageContent);
    // TODO: Implement actual message sending logic
    this.message.success('Message sent successfully!');
    this.newMessageContent = '';
  }
}

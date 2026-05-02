import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnDestroy,
  signal,
  inject,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { MarkdownModule } from 'ngx-markdown';
import { environment } from 'src/environments/environment';

export interface Module {
  id: string;
  title: string;
  content: string | File;
  moduleType: 'MD' | 'PDF';
}

@Component({
  selector: 'app-module-viewer',
  standalone: true,
  imports: [CommonModule, NzButtonModule, NzIconModule, MarkdownModule],
  template: `
    <div class="module-viewer" *ngIf="module">
      <div class="module-header">
        <h2>{{ module.title }}</h2>
        <div class="module-actions" *ngIf="canEdit">
          <button nz-button nzType="primary" nzSize="small" (click)="onEdit.emit(module)">
            <span nz-icon nzType="edit"></span>
            Edit
          </button>
          <button nz-button nzDanger nzSize="small" (click)="onDelete.emit(module)">
            <span nz-icon nzType="delete"></span>
            Delete
          </button>
        </div>
      </div>

      <div class="module-content">
        <!-- Markdown Content -->
        <div *ngIf="module.moduleType === 'MD'" class="markdown-content">
          <markdown [data]="getMarkdownContent()"></markdown>
        </div>

        <!-- PDF Content -->
        <div *ngIf="module.moduleType === 'PDF'" class="pdf-content">
          <div class="pdf-toolbar">
            <button nz-button nzType="default" (click)="downloadPdf()">
              <span nz-icon nzType="download"></span>
              Download PDF
            </button>
          </div>
          <iframe *ngIf="pdfBlobUrl()" [src]="pdfBlobUrl()" class="pdf-viewer"></iframe>
          <div *ngIf="!pdfBlobUrl()" class="pdf-loading">Loading PDF...</div>
        </div>
      </div>
    </div>

    <div class="no-module" *ngIf="!module">
      <span nz-icon nzType="file-text" class="empty-icon"></span>
      <p>Select a module to view its content</p>
    </div>
  `,
  styles: [
    `
      .module-viewer {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .module-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        border-bottom: 1px solid #f0f0f0;
      }

      .module-header h2 {
        margin: 0;
        font-size: 20px;
      }

      .module-actions {
        display: flex;
        gap: 8px;
      }

      .module-content {
        flex: 1;
        overflow: auto;
        padding: 24px;
      }

      .markdown-content {
        max-width: 900px;
        margin: 0 auto;
      }

      .pdf-content {
        height: 100%;
        display: flex;
        flex-direction: column;
      }

      .pdf-toolbar {
        margin-bottom: 16px;
      }

      .pdf-viewer {
        flex: 1;
        width: 100%;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
      }

      .pdf-loading {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #999;
      }

      .no-module {
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #999;
      }

      .empty-icon {
        font-size: 64px;
        margin-bottom: 16px;
        opacity: 0.3;
      }
    `,
  ],
})
export class ModuleViewerComponent implements OnChanges, OnDestroy {
  @Input() module: Module | null = null;
  @Input() canEdit = false;
  @Output() onEdit = new EventEmitter<Module>();
  @Output() onDelete = new EventEmitter<Module>();

  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private message = inject(NzMessageService);
  private apiUrl = environment.apiUrl;

  pdfBlobUrl = signal<SafeResourceUrl | null>(null);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['module']) {
      this.cleanupPdfBlob();

      if (this.module?.moduleType === 'PDF') {
        this.loadPdfBlob(this.module.id);
      }
    }
  }

  ngOnDestroy(): void {
    this.cleanupPdfBlob();
  }

  getMarkdownContent(): string {
    if (!this.module || this.module.moduleType !== 'MD') {
      return '';
    }
    return typeof this.module.content === 'string' ? this.module.content : '';
  }

  private loadPdfBlob(moduleId: string): void {
    this.http
      .get(`${this.apiUrl}/modules/${moduleId}/pdf`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.pdfBlobUrl.set(safeUrl);
        },
        error: (error) => {
          console.error('Error loading PDF:', error);
          this.message.error('Failed to load PDF file');
          this.pdfBlobUrl.set(null);
        },
      });
  }

  private cleanupPdfBlob(): void {
    const currentUrl = this.pdfBlobUrl();
    if (currentUrl) {
      const urlString = (currentUrl as any).changingThisBreaksApplicationSecurity;
      if (urlString && urlString.startsWith('blob:')) {
        URL.revokeObjectURL(urlString);
      }
      this.pdfBlobUrl.set(null);
    }
  }

  downloadPdf(): void {
    if (!this.module) return;

    this.http
      .get(`${this.apiUrl}/modules/${this.module.id}/pdf`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${this.module!.title}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error downloading PDF:', error);
          this.message.error('Failed to download PDF file');
        },
      });
  }
}

import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@services/auth-service';
import { environment } from 'src/environments/environment';
import { Profession } from '@pages/home/home';
import { MarkdownModule } from 'ngx-markdown';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { FormGroup, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { SelectedProfessionLayout } from '@app/layout/selected-profession/selected-profession.layout';
import { ForumViewComponent } from '@components/forum-view/forum-view.component';
import { GeminiService } from '@services/gemini.service';

export interface Subject {
  id: number;
  name: string;
  description: string;
  professions: Profession[];
  module: Module[];
  forum?: Forum;
}

export interface Module {
  id: string;
  title: string;
  content: string | File;
  moduleType: 'MD' | 'PDF';
}

export interface Forum {
  forumMessages: any[];
  id: string;
}

@Component({
  selector: 'app-selected-profession',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MarkdownModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTabsModule,
    NzToolTipModule,
    NzCheckboxModule,
    NzIconModule,
    ReactiveFormsModule,
    FormsModule,
    SelectedProfessionLayout,
    ForumViewComponent,
    NzSpinModule,
  ],
  templateUrl: './selected-profession.html',
  styleUrl: './selected-profession.scss',
})
export class SelectedProfession implements OnDestroy {
  protected readonly date = new Date();
  private apiUrl = environment.apiUrl;
  private message = inject(NzMessageService);
  private router = inject(Router);

  professionSubjects = signal<Subject[]>([]);
  selectedProfession = signal<Profession | null>(null);
  selectedModule = signal<Module | null>(null);

  // Computed property for markdown content (memoized)
  markdownContent = computed(() => {
    const module = this.selectedModule();
    if (!module?.content) {
      return undefined;
    }
    return typeof module.content === 'string' ? module.content : undefined;
  });

  isLoading = signal(true);
  loadError = signal<string | null>(null);

  // Edit mode state

  isSubjectModalVisible = signal(false);
  isModuleModalVisible = signal(false);
  isEditingSubject = signal(false);
  isEditingModule = signal(false);
  isLinkSubjectModalVisible = signal(false);

  subjectForm!: FormGroup;
  moduleForm!: FormGroup;
  selectedSubjectId: number | null = null;
  selectedModuleId: string | null = null;
  currentSubjectForModule: Subject | null = null;

  // Module preview content signal for better performance
  modulePreviewContent = signal<string>('');

  // PDF file upload
  selectedFile: File | null = null;
  selectedFileName = signal<string>('');

  // PDF blob URL for viewing (with authentication)
  pdfBlobUrl = signal<SafeResourceUrl | null>(null);

  // Available subjects for linking
  availableSubjects = signal<Subject[]>([]);
  selectedSubjectToLink: number | null = null;

  // Forum view state
  showForumView = signal(false);

  // Check if user can edit (ADMIN, SUPERADMIN, or TEACHER)

  // Gemini Summarization
  isSummarizing = signal(false);
  summaryResult = signal<string | null>(null);
  isSummaryModalVisible = signal(false);

  private geminiService = inject(GeminiService);

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {
    this.route.params.subscribe((params) => {
      this.loadData(params['id']);
    });

    // Handle query params for deep linking from chatbot
    this.route.queryParams.subscribe((params) => {
      if (params['moduleId']) {
        // Wait for data to load if not yet loaded
        if (this.professionSubjects().length > 0) {
          this.selectModuleById(params['moduleId'], params['quote'], params['page']);
        } else {
          // If data not loaded, set a flag or wait.
          // Since loadData is called on params change, we might need to wait for that.
          // A simple way is to check in loadData or use an effect.
          // For now, let's store the pending navigation
          this.pendingNavigation = {
            moduleId: params['moduleId'],
            quote: params['quote'],
            page: params['page'] ? parseInt(params['page']) : undefined,
          };
        }
      }
    });
  }

  private pendingNavigation: { moduleId: string; quote?: string; page?: number } | null = null;

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

          // Handle pending navigation
          if (this.pendingNavigation) {
            this.selectModuleById(
              this.pendingNavigation.moduleId,
              this.pendingNavigation.quote,
              this.pendingNavigation.page
            );
            this.pendingNavigation = null;
          }
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.loadError.set('Failed to load profession data. Please try again.');
        },
      });
  }

  private selectModuleById(moduleId: string, quote?: string, page?: number) {
    for (const subject of this.professionSubjects()) {
      const module = subject.module.find((m) => m.id === moduleId);
      if (module) {
        this.selectModule(module);

        // Handle scrolling after a short delay to allow rendering
        setTimeout(() => {
          if (quote && module.moduleType === 'MD') {
            this.scrollToQuote(quote);
          } else if (page && module.moduleType === 'PDF') {
            // PDF page navigation is handled by updating the URL in selectModule/loadPdfBlob
            // We need to pass the page to loadPdfBlob
            this.loadPdfBlob(module.id, page);
          }
        }, 500);
        return;
      }
    }
  }

  private scrollToQuote(quote: string) {
    // Simple text search and scroll
    // This is a bit hacky for rendered markdown but works for simple cases
    // A better approach would be to use a library or search in the raw markdown if we rendered it with IDs
    // For now, let's try window.find() or searching DOM elements

    // Note: window.find is not standard but widely supported.
    // Alternatively, we can search text nodes.

    const container = document.querySelector('.markdown-content-display');
    if (!container) return;

    // Remove quotes if present
    const cleanQuote = quote.replace(/^"|"$/g, '').trim();
    if (!cleanQuote) return;

    // Try to find the text in the container
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent?.includes(cleanQuote)) {
        const element = node.parentElement;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.backgroundColor = '#fff3cd'; // Highlight
          setTimeout(() => (element.style.backgroundColor = ''), 3000);
          return;
        }
      }
    }
  }

  // ... existing methods ...

  // Clean up blob URL to prevent memory leaks
  private cleanupPdfBlob(): void {
    const currentUrl = this.pdfBlobUrl();
    if (currentUrl) {
      // Extract the blob URL from SafeResourceUrl
      const urlString = (currentUrl as any).changingThisBreaksApplicationSecurity;
      if (urlString && urlString.startsWith('blob:')) {
        URL.revokeObjectURL(urlString);
      }
      this.pdfBlobUrl.set(null);
    }
  }

  private loadPdfBlob(moduleId: string, page?: number): void {
    // Clean up previous blob URL
    this.cleanupPdfBlob();

    this.http
      .get(`${this.apiUrl}/modules/${moduleId}/pdf`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          // Create object URL from blob
          const url = URL.createObjectURL(blob);
          // Append page hash if provided
          const fullUrl = page ? `${url}#page=${page}` : url;
          const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
          this.pdfBlobUrl.set(safeUrl);
        },
        error: (error) => {
          console.error('Error loading PDF:', error);
          this.message.error('Failed to load PDF file');
          this.pdfBlobUrl.set(null);
        },
      });
  }

  selectModule(module: Module) {
    // Toggle selection - if clicking the same module, deselect it
    if (this.selectedModule()?.id === module.id) {
      // Don't deselect if we are navigating to it (might be just refreshing view)
      // But original logic was toggle. Let's keep it but maybe check if we are navigating.
      // For now, let's assume if called from selectModuleById we want to select.
      // But selectModuleById calls this.
      // Let's just set it.
    }

    this.selectedModule.set(module);
    this.showForumView.set(false); // Close forum view when selecting a module

    // If it's a PDF module, load the PDF blob with authentication
    if (module.moduleType === 'PDF') {
      this.loadPdfBlob(module.id);
    } else {
      // Clean up previous PDF blob URL if switching from PDF to MD
      this.cleanupPdfBlob();
    }
  }

  openForumList() {
    this.showForumView.set(true);
    this.selectedModule.set(null);
    this.cleanupPdfBlob();
  }

  closeForumView() {
    console.log('closeForumView called in parent');
    this.showForumView.set(false);
    this.cdr.markForCheck();
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }

  // Gemini Summarization Logic
  async summarizeModule() {
    const module = this.selectedModule();
    if (!module) return;

    this.isSummarizing.set(true);
    this.summaryResult.set(null);

    try {
      if (module.moduleType === 'MD') {
        const content = this.markdownContent();
        if (content) {
          this.geminiService
            .generateContent(
              `Kérlek, foglald össze az alábbi tananyagot magyar nyelven:\n\n${content}`
            )
            .subscribe({
              next: (summary: string) => {
                this.summaryResult.set(summary);
                this.isSummaryModalVisible.set(true);
                this.isSummarizing.set(false);
              },
              error: (err: any) => {
                console.error('Gemini error:', err);
                this.message.error('Nem sikerült létrehozni az összefoglalót.');
                this.isSummarizing.set(false);
              },
            });
        } else {
          this.isSummarizing.set(false);
        }
      } else if (module.moduleType === 'PDF') {
        // Fetch the PDF blob again to process it
        this.http
          .get(`${this.apiUrl}/modules/${module.id}/pdf`, {
            responseType: 'blob',
          })
          .subscribe({
            next: async (blob) => {
              try {
                const images = await this.convertPdfToImages(blob);
                this.geminiService
                  .generateContent(
                    'Kérlek, foglald össze ezt a dokumentumot magyar nyelven. Tartalmazhat szöveget, képeket és grafikonokat. Elemezz minden vizuális és szöveges információt.',
                    images
                  )
                  .subscribe({
                    next: (summary: string) => {
                      this.summaryResult.set(summary);
                      this.isSummaryModalVisible.set(true);
                      this.isSummarizing.set(false);
                    },
                    error: (err: any) => {
                      console.error('Gemini error:', err);
                      this.message.error('Nem sikerült létrehozni az összefoglalót.');
                      this.isSummarizing.set(false);
                    },
                  });
              } catch (err) {
                console.error('PDF processing error:', err);
                this.message.error('Nem sikerült feldolgozni a PDF-et az összefoglaláshoz.');
                this.isSummarizing.set(false);
              }
            },
            error: (err: any) => {
              console.error('Error fetching PDF for summary:', err);
              this.message.error('Nem sikerült betölteni a PDF-et az összefoglaláshoz.');
              this.isSummarizing.set(false);
            },
          });
      }
    } catch (e) {
      console.error('Summarization error:', e);
      this.isSummarizing.set(false);
    }
  }

  private async convertPdfToImages(blob: Blob): Promise<string[]> {
    const arrayBuffer = await blob.arrayBuffer();
    // Dynamically import pdfjs-dist to avoid build issues if not used
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];
    const numPages = pdf.numPages;
    // Limit pages to avoid payload too large if necessary, but for now process all (or first 10?)
    // Let's process up to 5 pages for performance/cost in this demo, or all if small.
    // User wants "summarize content", so let's try all.

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 }); // 1.5 scale for decent quality
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        const renderContext: any = {
          canvasContext: context,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
        // Convert to base64 jpeg
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
        images.push(base64);
      }
    }
    return images;
  }

  closeSummaryModal() {
    this.isSummaryModalVisible.set(false);
    this.summaryResult.set(null);
  }

  ngOnDestroy(): void {
    // Clean up blob URL to prevent memory leaks
    this.cleanupPdfBlob();
  }
}

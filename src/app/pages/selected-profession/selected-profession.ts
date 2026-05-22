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
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
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
import { QuizService, Quiz, QuizAttempt } from '@services/quiz.service';

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
  forumMessages?: any[];
  id: string;
}

interface QuizFormQuestion {
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options: string[];
  correctAnswer: string;
  points: number;
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
  private quizService = inject(QuizService);

  subjectQuizzes = signal<Map<number, Quiz[]>>(new Map());

  professionSubjects = signal<Subject[]>([]);
  selectedProfession = signal<Profession | null>(null);
  selectedSubject = signal<Subject | null>(null);
  selectedModule = signal<Module | null>(null);

  markdownContent = computed(() => {
    const module = this.selectedModule();
    if (!module?.content) {
      return undefined;
    }
    return typeof module.content === 'string' ? module.content : undefined;
  });

  isLoading = signal(true);
  loadError = signal<string | null>(null);

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

  modulePreviewContent = signal<string>('');

  selectedFile: File | null = null;
  selectedFileName = signal<string>('');

  pdfBlobUrl = signal<SafeResourceUrl | null>(null);

  availableSubjects = signal<Subject[]>([]);
  selectedSubjectToLink: number | null = null;

  showForumView = signal(false);
  selectedForumSubjectId = signal<number | null>(null);

  isSummarizing = signal(false);
  summaryResult = signal<string | null>(null);
  isSummaryModalVisible = signal(false);

  isQuizModalVisible = signal(false);
  isSavingQuiz = signal(false);
  isQuizActionModalVisible = signal(false);
  isLoadingQuizAttempts = signal(false);
  showQuizAttemptsInModal = signal(false);
  selectedQuizForAction = signal<Quiz | null>(null);
  quizAttemptsForSelected = signal<QuizAttempt[]>([]);

  quizForm: {
    title: string;
    description: string;
    timeLimit: number | null;
    passingScore: number;
    isActive: boolean;
    questions: QuizFormQuestion[];
  } = {
    title: '',
    description: '',
    timeLimit: null,
    passingScore: 60,
    isActive: true,
    questions: [],
  };

  canManageQuizzes = computed(() => {
    const roles = this.authService.userRoles();
    return roles.includes('ADMIN') || roles.includes('TEACHER') || roles.includes('SUPERADMIN');
  });

  private geminiService = inject(GeminiService);

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
  ) {
    this.route.params.subscribe((params) => {
      this.loadData(params['id']);
    });

    this.route.queryParams.subscribe((params) => {
      if (params['moduleId']) {
        if (this.professionSubjects().length > 0) {
          this.selectModuleById(params['moduleId'], params['quote'], params['page']);
        } else {
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
      },
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
        }),
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
          this.selectedSubject.set(null);
          this.selectedModule.set(null);
          this.showForumView.set(false);
          this.selectedForumSubjectId.set(null);

          if (this.pendingNavigation) {
            this.selectModuleById(
              this.pendingNavigation.moduleId,
              this.pendingNavigation.quote,
              this.pendingNavigation.page,
            );
            this.pendingNavigation = null;
          }

          result.subjects.forEach((subject) => {
            this.loadQuizzesForSubject(subject.id);
          });
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.loadError.set('Nem sikerült betölteni a szakma adatait. Próbáld újra.');
        },
      });
  }

  loadQuizzesForSubject(subjectId: number) {
    this.quizService.getBySubject(subjectId.toString()).subscribe({
      next: (quizzes) => {
        if (quizzes && quizzes.length > 0) {
          this.subjectQuizzes.update((map) => {
            const newMap = new Map(map);
            newMap.set(subjectId, quizzes);
            return newMap;
          });
        }
      },
      error: (err) => console.error(`Failed to load quizzes for subject ${subjectId}`, err),
    });
  }

  getQuizzesForSubject(subjectId: number): Quiz[] {
    return this.subjectQuizzes().get(subjectId) || [];
  }

  navigateToQuiz(quizId: string) {
    this.router.navigate(['/quiz', quizId]);
  }

  handleQuizClick(quiz: Quiz) {
    if (!this.canManageQuizzes()) {
      this.navigateToQuiz(quiz.id);
      return;
    }

    this.selectedQuizForAction.set(quiz);
    this.showQuizAttemptsInModal.set(false);
    this.quizAttemptsForSelected.set([]);
    this.isQuizActionModalVisible.set(true);
  }

  closeQuizActionModal() {
    this.isQuizActionModalVisible.set(false);
    this.selectedQuizForAction.set(null);
    this.showQuizAttemptsInModal.set(false);
    this.quizAttemptsForSelected.set([]);
    this.isLoadingQuizAttempts.set(false);
  }

  startQuizFromActionModal() {
    const quiz = this.selectedQuizForAction();
    if (!quiz) {
      return;
    }

    this.closeQuizActionModal();
    this.navigateToQuiz(quiz.id);
  }

  openQuizResultsInActionModal() {
    const quiz = this.selectedQuizForAction();
    if (!quiz) {
      return;
    }

    this.showQuizAttemptsInModal.set(true);
    this.isLoadingQuizAttempts.set(true);

    this.quizService.getQuizAttempts(quiz.id).subscribe({
      next: (attempts) => {
        const sorted = [...attempts].sort((a, b) => {
          const aDate = a.completedAt || a.startedAt;
          const bDate = b.completedAt || b.startedAt;
          return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
        this.quizAttemptsForSelected.set(sorted);
        this.isLoadingQuizAttempts.set(false);
      },
      error: (err) => {
        console.error('Failed to load quiz attempts:', err);
        this.message.error('Nem sikerült betölteni az eredményeket.');
        this.isLoadingQuizAttempts.set(false);
      },
    });
  }

  openAttemptResult(attemptId: string) {
    const quiz = this.selectedQuizForAction();
    if (!quiz) {
      return;
    }

    this.closeQuizActionModal();
    this.router.navigate(['/quiz', quiz.id, 'results'], {
      queryParams: { attemptId },
    });
  }

  openCreateQuizModal() {
    if (!this.canManageQuizzes()) {
      this.message.error('Nincs jogosultságod kvíz létrehozásához.');
      return;
    }

    if (!this.selectedSubject()) {
      this.message.error('Előbb válassz tantárgyat.');
      return;
    }

    this.quizForm = {
      title: '',
      description: '',
      timeLimit: null,
      passingScore: 60,
      isActive: true,
      questions: [],
    };
    this.addQuizQuestion();
    this.isQuizModalVisible.set(true);
  }

  closeQuizModal() {
    this.isQuizModalVisible.set(false);
  }

  addQuizQuestion() {
    this.quizForm.questions.push({
      type: 'MULTIPLE_CHOICE',
      question: '',
      options: ['1. opció', '2. opció'],
      correctAnswer: '1. opció',
      points: 1,
    });
  }

  removeQuizQuestion(index: number) {
    this.quizForm.questions.splice(index, 1);
  }

  onQuestionTypeChange(index: number) {
    const question = this.quizForm.questions[index];
    if (!question) return;

    if (question.type === 'MULTIPLE_CHOICE') {
      question.options = question.options.length > 1 ? question.options : ['1. opció', '2. opció'];
      if (!question.options.includes(question.correctAnswer)) {
        question.correctAnswer = question.options[0] || '';
      }
      return;
    }

    if (question.type === 'TRUE_FALSE') {
      question.options = [];
      if (question.correctAnswer !== 'true' && question.correctAnswer !== 'false') {
        question.correctAnswer = 'true';
      }
      return;
    }

    question.options = [];
    question.correctAnswer = '';
  }

  addOption(questionIndex: number) {
    const question = this.quizForm.questions[questionIndex];
    if (!question || question.type !== 'MULTIPLE_CHOICE') return;

    question.options.push('');
    if (!question.correctAnswer) {
      question.correctAnswer = question.options[0] || '';
    }
  }

  removeOption(questionIndex: number, optionIndex: number) {
    const question = this.quizForm.questions[questionIndex];
    if (!question || question.type !== 'MULTIPLE_CHOICE') return;
    if (question.options.length <= 2) {
      this.message.warning('Legalább 2 opció szükséges.');
      return;
    }

    const removed = question.options[optionIndex];
    question.options.splice(optionIndex, 1);

    if (question.correctAnswer === removed) {
      question.correctAnswer = question.options[0] || '';
    }
  }

  saveQuiz() {
    const subject = this.selectedSubject();
    if (!subject) {
      this.message.error('Nincs kiválasztott tantárgy.');
      return;
    }

    if (!this.quizForm.title.trim()) {
      this.message.error('Add meg a kvíz címét.');
      return;
    }

    if (this.quizForm.questions.length === 0) {
      this.message.error('Adj hozzá legalább 1 kérdést.');
      return;
    }

    for (let i = 0; i < this.quizForm.questions.length; i++) {
      const question = this.quizForm.questions[i];
      if (!question.question.trim()) {
        this.message.error(`A(z) ${i + 1}. kérdés szövege kötelező.`);
        return;
      }

      if (!question.points || question.points < 1) {
        this.message.error(`A(z) ${i + 1}. kérdés pontszáma legalább 1 legyen.`);
        return;
      }

      if (question.type === 'MULTIPLE_CHOICE') {
        const cleanedOptions = question.options.map((opt) => opt.trim()).filter((opt) => !!opt);
        if (cleanedOptions.length < 2) {
          this.message.error(`A(z) ${i + 1}. kérdéshez legalább 2 válaszopció kell.`);
          return;
        }

        if (!cleanedOptions.includes(question.correctAnswer)) {
          this.message.error(`A(z) ${i + 1}. kérdésnél válassz helyes választ az opciók közül.`);
          return;
        }
      } else if (!question.correctAnswer.trim()) {
        this.message.error(`A(z) ${i + 1}. kérdésnél add meg a helyes választ.`);
        return;
      }
    }

    const payload: Partial<Quiz> = {
      title: this.quizForm.title.trim(),
      description: this.quizForm.description?.trim() || '',
      subjectId: subject.id.toString(),
      timeLimit: this.quizForm.timeLimit ?? undefined,
      passingScore: this.quizForm.passingScore,
      isActive: this.quizForm.isActive,
      questions: this.quizForm.questions.map((question, index) => {
        const cleanedOptions = question.options.map((opt) => opt.trim()).filter((opt) => !!opt);
        return {
          type: question.type,
          question: question.question.trim(),
          options: question.type === 'MULTIPLE_CHOICE' ? JSON.stringify(cleanedOptions) : undefined,
          correctAnswer: question.correctAnswer.trim(),
          points: question.points,
          orderIndex: index,
        };
      }),
    };

    this.isSavingQuiz.set(true);
    this.quizService.create(payload).subscribe({
      next: () => {
        this.message.success('Kvíz létrehozva.');
        this.isSavingQuiz.set(false);
        this.closeQuizModal();
        this.loadQuizzesForSubject(subject.id);
      },
      error: (err) => {
        const errorResponse = err as HttpErrorResponse;
        console.error('Error creating quiz:', errorResponse);

        const backendMessage =
          typeof errorResponse?.error === 'string'
            ? errorResponse.error
            : errorResponse?.error?.message || errorResponse?.error?.error;

        this.message.error(
          backendMessage
            ? `Nem sikerült létrehozni a kvízt: ${backendMessage}`
            : 'Nem sikerült létrehozni a kvízt.',
        );
        this.isSavingQuiz.set(false);
      },
    });
  }

  selectSubject(subject: Subject) {
    this.selectedSubject.set(subject);
    this.selectedModule.set(null);
    this.showForumView.set(false);
    this.selectedForumSubjectId.set(null);
    this.cleanupPdfBlob();
  }

  private selectModuleById(moduleId: string, quote?: string, page?: number) {
    for (const subject of this.professionSubjects()) {
      const module = subject.module.find((m) => m.id === moduleId);
      if (module) {
        this.selectModule(module);

        setTimeout(() => {
          if (quote && module.moduleType === 'MD') {
            this.scrollToQuote(quote);
          } else if (page && module.moduleType === 'PDF') {
            this.loadPdfBlob(module.id, page);
          }
        }, 500);
        return;
      }
    }
  }

  private scrollToQuote(quote: string) {
    const container = document.querySelector('.markdown-content-display');
    if (!container) return;

    const cleanQuote = quote.replace(/^"|"$/g, '').trim();
    if (!cleanQuote) return;

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent?.includes(cleanQuote)) {
        const element = node.parentElement;
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.style.backgroundColor = '#fff3cd';
          setTimeout(() => (element.style.backgroundColor = ''), 3000);
          return;
        }
      }
    }
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

  private loadPdfBlob(moduleId: string, page?: number): void {
    this.cleanupPdfBlob();

    this.http
      .get(`${this.apiUrl}/modules/${moduleId}/pdf`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);

          const fullUrl = page ? `${url}#page=${page}` : url;
          const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(fullUrl);
          this.pdfBlobUrl.set(safeUrl);
        },
        error: (error) => {
          console.error('Error loading PDF:', error);
          this.message.error('Nem sikerült betölteni a PDF fájlt');
          this.pdfBlobUrl.set(null);
        },
      });
  }

  selectModule(module: Module) {
    if (this.selectedModule()?.id === module.id) {
      this.selectedModule.set(null);
      this.cleanupPdfBlob();
      return;
    }

    const subject = this.professionSubjects().find((item) =>
      item.module.some((subjectModule) => subjectModule.id === module.id),
    );
    if (subject) {
      this.selectedSubject.set(subject);
    }

    this.selectedModule.set(module);
    this.showForumView.set(false);

    if (module.moduleType === 'PDF') {
      this.loadPdfBlob(module.id);
    } else {
      this.cleanupPdfBlob();
    }
  }

  openForumList(subjectId?: number) {
    if (subjectId) {
      const subject = this.professionSubjects().find((item) => item.id === subjectId);
      if (subject) {
        this.selectedSubject.set(subject);
      }
    }
    this.selectedForumSubjectId.set(subjectId ?? null);
    this.showForumView.set(true);
    this.selectedModule.set(null);
    this.cleanupPdfBlob();
  }

  closeForumView() {
    console.log('closeForumView called in parent');
    this.showForumView.set(false);
    this.selectedForumSubjectId.set(null);
    this.cdr.markForCheck();
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }

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
              `Kérlek, foglald össze az alábbi tananyagot magyar nyelven:\n\n${content}`,
            )
            .subscribe({
              next: (summary: string) => {
                this.summaryResult.set(summary);
                this.isSummaryModalVisible.set(true);
                this.isSummarizing.set(false);
              },
              error: (err: any) => {
                console.error('Gemini error:', err);
                this.message.error(err?.message || 'Nem sikerült létrehozni az összefoglalót.');
                this.isSummarizing.set(false);
              },
            });
        } else {
          this.isSummarizing.set(false);
        }
      } else if (module.moduleType === 'PDF') {
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
                    images,
                  )
                  .subscribe({
                    next: (summary: string) => {
                      this.summaryResult.set(summary);
                      this.isSummaryModalVisible.set(true);
                      this.isSummarizing.set(false);
                    },
                    error: (err: any) => {
                      console.error('Gemini error:', err);
                      this.message.error(
                        err?.message || 'Nem sikerült létrehozni az összefoglalót.',
                      );
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

    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.mjs`;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const images: string[] = [];
    const numPages = pdf.numPages;

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
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
    this.cleanupPdfBlob();
  }
}

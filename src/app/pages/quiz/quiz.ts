import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  OnDestroy,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzMessageService } from 'ng-zorro-antd/message';
import { FormsModule } from '@angular/forms';
import {
  QuizService,
  Quiz,
  QuizQuestion,
  QuizAttempt,
  QuizSubmitRequest,
} from '@services/quiz.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-quiz',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzCardModule,
    NzResultModule,
    NzSpinModule,
    NzRadioModule,
    NzCheckboxModule,
    NzInputModule,
    NzFormModule,
    NzIconModule,
    NzProgressModule,
  ],
  templateUrl: './quiz.html',
  styleUrl: './quiz.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizService = inject(QuizService);
  private message = inject(NzMessageService);

  quiz = signal<Quiz | null>(null);
  currentAttempt = signal<QuizAttempt | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  questions = signal<QuizQuestion[]>([]);
  currentQuestionIndex = signal(0);
  answers = signal<Record<string, string>>({});

  timeRemaining = signal<number | null>(null);
  private timerSubscription?: Subscription;

  currentQuestion = computed(() => {
    const questions = this.questions();
    const index = this.currentQuestionIndex();
    return questions.length > 0 && index < questions.length ? questions[index] : null;
  });

  progress = computed(() => {
    const total = this.questions().length;
    if (total === 0) return 0;
    return Math.round(((this.currentQuestionIndex() + 1) / total) * 100);
  });

  formattedTime = computed(() => {
    const seconds = this.timeRemaining();
    if (seconds === null) return '';

    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  });

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const quizId = params['id'];
      if (quizId) {
        this.loadQuiz(quizId);
      }
    });
  }

  ngOnDestroy() {
    this.stopTimer();
  }

  loadQuiz(id: string) {
    this.isLoading.set(true);
    this.quizService.getById(id).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        if (quiz.questions) {
          const processedQuestions = quiz.questions.map((q) => {
            if (q.type === 'MULTIPLE_CHOICE' && typeof q.options === 'string') {
              try {
              } catch (e) {
                console.error('Error parsing options', e);
              }
            }
            return q;
          });

          this.questions.set(processedQuestions.sort((a, b) => a.orderIndex - b.orderIndex));
        }
        this.startAttempt(quiz.id);
      },
      error: (err) => {
        console.error('Error loading quiz', err);
        this.error.set('Nem sikerült betölteni a kvízt');
        this.isLoading.set(false);
      },
    });
  }

  startAttempt(quizId: string) {
    this.quizService.startQuiz(quizId).subscribe({
      next: (attempt) => {
        this.currentAttempt.set(attempt);
        this.isLoading.set(false);

        const limit = this.quiz()?.timeLimit;
        if (limit) {
          this.timeRemaining.set(limit * 60);
          this.startTimer();
        }
      },
      error: (err) => {
        console.error('Error starting quiz attempt', err);
        this.error.set('Nem sikerült elindítani a kvíz kitöltését');
        this.isLoading.set(false);
      },
    });
  }

  startTimer() {
    this.timerSubscription = interval(1000).subscribe(() => {
      const current = this.timeRemaining();
      if (current !== null) {
        if (current > 0) {
          this.timeRemaining.set(current - 1);
        } else {
          this.submitQuiz(true);
        }
      }
    });
  }

  stopTimer() {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
    }
  }

  selectAnswer(answer: string) {
    const qId = this.currentQuestion()?.id;
    if (qId) {
      this.answers.update((curr) => ({ ...curr, [qId]: answer }));
    }
  }

  nextQuestion() {
    if (this.currentQuestionIndex() < this.questions().length - 1) {
      this.currentQuestionIndex.update((i) => i + 1);
    }
  }

  prevQuestion() {
    if (this.currentQuestionIndex() > 0) {
      this.currentQuestionIndex.update((i) => i - 1);
    }
  }

  submitQuiz(timeUpdate = false) {
    if (this.isLoading() && !timeUpdate) return;

    const attemptId = this.currentAttempt()?.id;
    const quizId = this.quiz()?.id;

    if (!attemptId || !quizId) return;

    this.stopTimer();
    this.isLoading.set(true);

    const request: QuizSubmitRequest = {
      quizId,
      attemptId,
      answers: this.answers(),
    };

    this.quizService.submitQuiz(quizId, request).subscribe({
      next: (result) => {
        this.message.success('A kvíz sikeresen beküldve!');
        this.router.navigate(['/quiz', quizId, 'results'], {
          queryParams: { attemptId: result.id },
        });
      },
      error: (err) => {
        console.error('Error submitting quiz', err);
        this.message.error('Nem sikerült beküldeni a kvízt');
        this.isLoading.set(false);
      },
    });
  }

  getOptions(question: QuizQuestion): string[] {
    if (!question.options) return [];
    try {
      return JSON.parse(question.options);
    } catch (e) {
      return [];
    }
  }

  goHome() {
    this.router.navigate(['/home']);
  }
}

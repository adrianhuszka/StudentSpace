import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  OnInit,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { QuizService, Quiz, QuizAttempt, QuizQuestion } from '@services/quiz.service';

@Component({
  selector: 'app-quiz-results',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzCardModule,
    NzResultModule,
    NzSpinModule,
    NzIconModule,
    NzStatisticModule,
    NzCollapseModule,
  ],
  templateUrl: './quiz-results.html',
  styleUrl: './quiz-results.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuizResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private quizService = inject(QuizService);

  quiz = signal<Quiz | null>(null);
  attempt = signal<QuizAttempt | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  questions = signal<QuizQuestion[]>([]);
  studentAnswers = signal<Record<string, string>>({});

  scoreColor = computed(() => {
    const attempt = this.attempt();
    if (!attempt) return '#000';
    return attempt.passed ? '#52c41a' : '#ff4d4f';
  });

  resultStatus = computed(() => {
    const attempt = this.attempt();
    if (!attempt) return 'info';
    return attempt.passed ? 'success' : 'error';
  });

  resultTitle = computed(() => {
    const attempt = this.attempt();
    if (!attempt) return '';
    return attempt.passed ? 'Congratulations! You Passed!' : 'Quiz Failed';
  });

  resultSubtitle = computed(() => {
    const attempt = this.attempt();
    if (!attempt) return '';
    return `You scored ${attempt.score}% (${attempt.pointsEarned}/${attempt.totalPoints} points)`;
  });

  ngOnInit() {
    this.route.params.subscribe((params) => {
      const quizId = params['id'];
      if (quizId) {
        this.loadQuiz(quizId);
      }
    });

    this.route.queryParams.subscribe((params) => {
      const attemptId = params['attemptId'];
      if (attemptId) {
        // If we have quiz ID already, we could load attempt in parallel, but simplify for now
      }
    });
  }

  loadQuiz(id: string) {
    this.isLoading.set(true);
    this.quizService.getById(id).subscribe({
      next: (quiz) => {
        this.quiz.set(quiz);
        if (quiz.questions) {
          this.questions.set(quiz.questions.sort((a, b) => a.orderIndex - b.orderIndex));
        }

        // Load attempt
        const attemptId = this.route.snapshot.queryParams['attemptId'];
        if (attemptId) {
          this.loadAttempt(id, attemptId);
        } else {
          // If no attempt ID, maybe show history? For now error
          this.error.set('No attempt specified');
          this.isLoading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading quiz', err);
        this.error.set('Failed to load quiz');
        this.isLoading.set(false);
      },
    });
  }

  loadAttempt(quizId: string, attemptId: string) {
    this.quizService.getQuizAttempts(quizId).subscribe({
      next: (attempts) => {
        const attempt = attempts.find((a) => a.id === attemptId);
        if (attempt) {
          this.attempt.set(attempt);
          try {
            this.studentAnswers.set(JSON.parse(attempt.answers));
          } catch (e) {
            console.error('Error parsing answers', e);
          }
        } else {
          this.error.set('Attempt not found');
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading attempts', err);
        this.error.set('Failed to load result');
        this.isLoading.set(false);
      },
    });
  }

  getStudentAnswer(questionId: string | undefined): string {
    if (!questionId) return '';
    return this.studentAnswers()[questionId] || 'No answer';
  }

  isCorrect(question: QuizQuestion): boolean {
    const studentAnswer = this.getStudentAnswer(question.id);
    return studentAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
  }

  backToProfession() {
    // Navigate back to selected profession if possible, or home
    // We don't easily know the profession ID without loading it via subject/module
    // For now, go home
    this.router.navigate(['/home']);
  }
}

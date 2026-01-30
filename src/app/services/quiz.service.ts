import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Quiz {
  id: string;
  title: string;
  description: string;
  moduleId?: string;
  subjectId?: string; // UUID from backend
  timeLimit?: number; // minutes
  passingScore: number; // percentage
  isActive: boolean;
  questions?: QuizQuestion[];
  createdAt?: string;
  updatedAt?: string;
}

export interface QuizQuestion {
  id?: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'SHORT_ANSWER';
  question: string;
  options?: string; // JSON string
  correctAnswer: string;
  points: number;
  orderIndex: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  studentId: string;
  startedAt: string;
  completedAt?: string;
  answers: string; // JSON string
  score?: number;
  pointsEarned?: number;
  totalPoints?: number;
  passed?: boolean;
}

export interface QuizSubmitRequest {
  quizId: string;
  attemptId: string;
  answers: Record<string, string>;
}

@Injectable({
  providedIn: 'root',
})
export class QuizService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/quizzes`;

  getAll(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(this.apiUrl);
  }

  getAllAdmin(): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.apiUrl}/all`);
  }

  getById(id: string): Observable<Quiz> {
    return this.http.get<Quiz>(`${this.apiUrl}/${id}`);
  }

  getByModule(moduleId: string): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.apiUrl}/by-module/${moduleId}`);
  }

  getBySubject(subjectId: string): Observable<Quiz[]> {
    return this.http.get<Quiz[]>(`${this.apiUrl}/by-subject/${subjectId}`);
  }

  create(quiz: Partial<Quiz>): Observable<Quiz> {
    return this.http.post<Quiz>(this.apiUrl, quiz);
  }

  update(quiz: Partial<Quiz>): Observable<Quiz> {
    return this.http.put<Quiz>(this.apiUrl, quiz);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Attempt methods
  startQuiz(quizId: string): Observable<QuizAttempt> {
    return this.http.post<QuizAttempt>(`${this.apiUrl}/${quizId}/start`, {});
  }

  submitQuiz(quizId: string, request: QuizSubmitRequest): Observable<QuizAttempt> {
    return this.http.post<QuizAttempt>(`${this.apiUrl}/${quizId}/submit`, request);
  }

  getMyAttempts(): Observable<QuizAttempt[]> {
    return this.http.get<QuizAttempt[]>(`${this.apiUrl}/my-attempts`);
  }

  getQuizAttempts(quizId: string): Observable<QuizAttempt[]> {
    return this.http.get<QuizAttempt[]>(`${this.apiUrl}/${quizId}/attempts`);
  }
}

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { QuizService } from './quiz.service';
import { environment } from 'src/environments/environment';

describe('QuizService', () => {
  let service: QuizService;
  let httpMock: HttpTestingController;

  const baseUrl = `${environment.apiUrl}/quizzes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(QuizService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call getAll endpoint', () => {
    service.getAll().subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getAllAdmin endpoint', () => {
    service.getAllAdmin().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/all`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getById endpoint', () => {
    service.getById('quiz-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/quiz-1`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should call getByModule endpoint', () => {
    service.getByModule('module-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/by-module/module-1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getBySubject endpoint', () => {
    service.getBySubject('subject-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/by-subject/subject-1`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call create endpoint', () => {
    const payload = { title: 'Quiz' };
    service.create(payload).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('should call update endpoint', () => {
    const payload = { id: 'quiz-1', title: 'Quiz Updated' };
    service.update(payload).subscribe();
    const req = httpMock.expectOne(baseUrl);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    req.flush({});
  });

  it('should call delete endpoint', () => {
    service.delete('quiz-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/quiz-1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('should call startQuiz endpoint', () => {
    service.startQuiz('quiz-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/quiz-1/start`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({});
  });

  it('should call submitQuiz endpoint', () => {
    const request = {
      quizId: 'quiz-1',
      attemptId: 'attempt-1',
      answers: { q1: 'A' },
    };

    service.submitQuiz('quiz-1', request).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/quiz-1/submit`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush({});
  });

  it('should call getMyAttempts endpoint', () => {
    service.getMyAttempts().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/my-attempts`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call getQuizAttempts endpoint', () => {
    service.getQuizAttempts('quiz-1').subscribe();
    const req = httpMock.expectOne(`${baseUrl}/quiz-1/attempts`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

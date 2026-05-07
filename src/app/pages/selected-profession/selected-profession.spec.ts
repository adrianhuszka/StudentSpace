import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { NzMessageService } from 'ng-zorro-antd/message';
import { EMPTY } from 'rxjs';
import { AuthService } from '@services/auth-service';
import { GeminiService } from '@services/gemini.service';
import { QuizService } from '@services/quiz.service';

import { SelectedProfession } from './selected-profession';

describe('SelectedProfession', () => {
  let component: SelectedProfession;
  let fixture: ComponentFixture<SelectedProfession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectedProfession],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            params: EMPTY,
            queryParams: EMPTY,
          },
        },
        {
          provide: HttpClient,
          useValue: jasmine.createSpyObj('HttpClient', ['get', 'post', 'put', 'delete']),
        },
        {
          provide: AuthService,
          useValue: {
            userRoles: () => ['USER'],
            getUser: () => ({ id: 'u1', username: 'user', fullName: 'User', roles: ['USER'] }),
          },
        },
        {
          provide: DomSanitizer,
          useValue: jasmine.createSpyObj('DomSanitizer', ['bypassSecurityTrustResourceUrl']),
        },
        {
          provide: NzMessageService,
          useValue: jasmine.createSpyObj('NzMessageService', ['error', 'success', 'warning']),
        },
        {
          provide: GeminiService,
          useValue: jasmine.createSpyObj('GeminiService', ['summarizeText']),
        },
        {
          provide: QuizService,
          useValue: jasmine.createSpyObj('QuizService', [
            'getBySubject',
            'create',
            'update',
            'delete',
            'getQuizAttempts',
          ]),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectedProfession);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

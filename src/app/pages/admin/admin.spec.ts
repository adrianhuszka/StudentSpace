import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';
import { AdminService } from '@services/admin.service';
import { ProfessionService } from '@services/profession.service';
import { SubjectService } from '@services/subject.service';
import { QuizService } from '@services/quiz.service';
import { AuthService } from '@services/auth-service';

import { Admin } from './admin';

describe('Admin', () => {
  let component: Admin;
  let fixture: ComponentFixture<Admin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Admin],
      providers: [
        provideRouter([]),
        {
          provide: NzMessageService,
          useValue: jasmine.createSpyObj('NzMessageService', ['error', 'success']),
        },
        {
          provide: AdminService,
          useValue: jasmine.createSpyObj('AdminService', ['getUserStats', 'getAll']),
        },
        {
          provide: ProfessionService,
          useValue: jasmine.createSpyObj('ProfessionService', ['getProfessionStats', 'getAll']),
        },
        {
          provide: SubjectService,
          useValue: jasmine.createSpyObj('SubjectService', ['getAllSubjects']),
        },
        { provide: QuizService, useValue: jasmine.createSpyObj('QuizService', ['getAllAdmin']) },
        {
          provide: AuthService,
          useValue: {
            userRoles: () => ['ADMIN'],
            getUser: () => ({ username: 'admin', roles: ['ADMIN'] }),
            logout: () => Promise.resolve(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Admin);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

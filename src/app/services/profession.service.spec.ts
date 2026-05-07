import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ProfessionService } from './profession.service';
import { environment } from 'src/environments/environment';

describe('ProfessionService', () => {
  let service: ProfessionService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: NzMessageService,
          useValue: jasmine.createSpyObj('NzMessageService', ['success', 'error']),
        },
      ],
    });

    service = TestBed.inject(ProfessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call inherited getAll endpoint', () => {
    service.getAll().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/professions`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should call inherited getById endpoint', () => {
    service.getById(2).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/professions/2`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('should call getProfessionStats endpoint', () => {
    service.getProfessionStats().subscribe();

    const req = httpMock.expectOne(`${baseUrl}/professions/stats`);
    expect(req.request.method).toBe('GET');
    req.flush({
      totalProfessions: 1,
      totalSubjects: 2,
      totalModules: 3,
      averageSubjectsPerProfession: 2,
    });
  });

  it('should call getSubjectsForProfession endpoint', () => {
    service.getSubjectsForProfession(3).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/subjects/by-profession/3`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});

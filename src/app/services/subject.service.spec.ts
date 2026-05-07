import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { SubjectService } from './subject.service';
import { environment } from 'src/environments/environment';

describe('SubjectService', () => {
  let service: SubjectService;
  let httpMock: HttpTestingController;

  const baseUrl = environment.apiUrl;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(SubjectService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should request subjects by profession', () => {
    service.getSubjectsByProfession(12).subscribe();
    const req = httpMock.expectOne(`${baseUrl}/subjects/by-profession/12`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should request all subjects', () => {
    service.getAllSubjects().subscribe();
    const req = httpMock.expectOne(`${baseUrl}/subjects`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('should create subject with text response config', () => {
    const payload = { name: 'Math' };
    service.createSubject(payload).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/subjects`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    expect(req.request.responseType).toBe('text');
    req.flush('ok');
  });

  it('should update subject with text response config', () => {
    const payload = { id: 1, name: 'Math 2' };
    service.updateSubject(payload).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/subjects`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
    expect(req.request.responseType).toBe('text');
    req.flush('ok');
  });

  it('should delete subject', () => {
    service.deleteSubject(4).subscribe();

    const req = httpMock.expectOne(`${baseUrl}/subjects/4`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.responseType).toBe('text');
    req.flush('ok');
  });

  it('should request module content', () => {
    service.getModule('m1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/modules/m1`);
    expect(req.request.method).toBe('GET');
    req.flush({ content: '# md' });
  });

  it('should request module pdf blob', () => {
    service.getPdfBlob('m1').subscribe();

    const req = httpMock.expectOne(`${baseUrl}/modules/m1/pdf`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['pdf']));
  });

  it('should include markdown content in form data for MD module', () => {
    const formData = service.createModuleFormData('Intro', 'MD', 10, '# Title');

    expect(formData.get('title')).toBe('Intro');
    expect(formData.get('moduleType')).toBe('MD');
    expect(formData.get('subjectId')).toBe('10');
    expect(formData.get('content')).toBe('# Title');
    expect(formData.get('pdfFile')).toBeNull();
  });

  it('should include pdf file in form data for PDF module', () => {
    const file = new File(['dummy'], 'module.pdf', { type: 'application/pdf' });

    const formData = service.createModuleFormData('PDF Module', 'PDF', 11, file, 'module-id');

    expect(formData.get('id')).toBe('module-id');
    expect(formData.get('title')).toBe('PDF Module');
    expect(formData.get('moduleType')).toBe('PDF');
    expect(formData.get('subjectId')).toBe('11');
    expect(formData.get('pdfFile')).toEqual(file);
    expect(formData.get('content')).toBeNull();
  });
});

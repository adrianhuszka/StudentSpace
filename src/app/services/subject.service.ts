import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { Profession } from '@pages/home/home';

export interface Subject {
  id: number;
  name: string;
  description: string;
  professions: Profession[];
  module: Module[];
}

export interface Module {
  id: string;
  title: string;
  content: string | File;
  moduleType: 'MD' | 'PDF';
}

@Injectable({
  providedIn: 'root',
})
export class SubjectService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Subject operations
  getSubjectsByProfession(professionId: string | number): Observable<Subject[]> {
    return this.http.get<Subject[]>(`${this.apiUrl}/subjects/by-profession/${professionId}`);
  }

  getAllSubjects(): Observable<Subject[]> {
    return this.http.get<Subject[]>(`${this.apiUrl}/subjects`);
  }

  createSubject(data: Partial<Subject>): Observable<any> {
    return this.http.post(`${this.apiUrl}/subjects`, data, {
      observe: 'response',
      responseType: 'text',
    });
  }

  updateSubject(data: Partial<Subject> & { id: number }): Observable<any> {
    return this.http.put(`${this.apiUrl}/subjects`, data, {
      observe: 'response',
      responseType: 'text',
    });
  }

  deleteSubject(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/subjects/${id}`, {
      observe: 'response',
      responseType: 'text',
    });
  }

  linkSubjectToProfession(subjectId: number, professionId: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/subjects/link-subject-to-profession?subjectId=${subjectId}&professionId=${professionId}`,
      null,
      {
        observe: 'response',
        responseType: 'text',
      }
    );
  }

  unlinkSubjectFromProfession(subjectId: number, professionId: number): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/subjects/unlink-subject-from-profession?subjectId=${subjectId}&professionId=${professionId}`,
      null,
      {
        observe: 'response',
        responseType: 'text',
      }
    );
  }

  // Module operations
  getModule(id: string): Observable<{ content: string }> {
    return this.http.get<{ content: string }>(`${this.apiUrl}/modules/${id}`);
  }

  createModule(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/modules`, data, {
      observe: 'response',
      responseType: 'text',
    });
  }

  updateModule(data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/modules`, data, {
      observe: 'response',
      responseType: 'text',
    });
  }

  deleteModule(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/modules/${id}`, {
      observe: 'response',
      responseType: 'text',
    });
  }

  getPdfBlob(moduleId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/modules/${moduleId}/pdf`, {
      responseType: 'blob',
    });
  }

  /**
   * Helper method to create FormData for module creation/update
   */
  createModuleFormData(
    title: string,
    moduleType: 'MD' | 'PDF',
    subjectId: number,
    content?: string | File,
    moduleId?: string
  ): FormData {
    const formData = new FormData();

    if (moduleId) {
      formData.append('id', moduleId);
    }
    formData.append('title', title);
    formData.append('moduleType', moduleType);
    formData.append('subjectId', subjectId.toString());

    if (moduleType === 'MD' && typeof content === 'string') {
      formData.append('content', content || '');
    } else if (moduleType === 'PDF' && content instanceof File) {
      formData.append('pdfFile', content, content.name);
    }

    return formData;
  }
}

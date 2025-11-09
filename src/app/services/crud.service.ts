import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { NzMessageService } from 'ng-zorro-antd/message';
import { environment } from 'src/environments/environment';

export interface CrudOperations<T> {
  getAll(): Observable<T[]>;
  getById(id: number | string): Observable<T>;
  create(data: Partial<T>): Observable<any>;
  update(data: Partial<T> & { id: number | string }): Observable<any>;
  delete(id: number | string): Observable<any>;
}

export abstract class CrudService<T> implements CrudOperations<T> {
  protected http = inject(HttpClient);
  protected message = inject(NzMessageService);
  protected apiUrl = environment.apiUrl;

  constructor(protected endpoint: string) {}

  getAll(): Observable<T[]> {
    return this.http.get<T[]>(`${this.apiUrl}/${this.endpoint}`);
  }

  getById(id: number | string): Observable<T> {
    return this.http.get<T>(`${this.apiUrl}/${this.endpoint}/${id}`);
  }

  create(data: Partial<T>): Observable<any> {
    return this.http.post(`${this.apiUrl}/${this.endpoint}`, data, {
      observe: 'response',
      responseType: 'text',
    });
  }

  update(data: Partial<T> & { id: number | string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/${this.endpoint}`, data, {
      observe: 'response',
      responseType: 'text',
    });
  }

  delete(id: number | string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${this.endpoint}/${id}`, {
      observe: 'response',
      responseType: 'text',
    });
  }

  /**
   * Handle successful operation with message
   */
  handleSuccess(message: string, callback?: () => void) {
    this.message.success(message);
    if (callback) callback();
  }

  /**
   * Handle error with message
   */
  handleError(error: any, customMessage?: string) {
    console.error('CRUD operation error:', error);
    this.message.error(customMessage || 'Operation failed. Please try again.');
  }
}

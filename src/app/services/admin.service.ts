import { Injectable } from '@angular/core';
import { CrudService } from './crud.service';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  roles: string[];
  enabled: boolean;
  createdAt?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  teacherUsers: number;
}

@Injectable({
  providedIn: 'root',
})
export class AdminService extends CrudService<User> {
  constructor() {
    super('users');
  }

  getUserStats() {
    return this.http.get<UserStats>(`${this.apiUrl}/users/stats`);
  }

  updateUserRoles(userId: string, roles: string[]) {
    return this.http.put(`${this.apiUrl}/users/${userId}/roles`, { roles });
  }

  toggleUserStatus(userId: string) {
    return this.http.put<boolean>(`${this.apiUrl}/users/${userId}/toggle-status`, {});
  }
}

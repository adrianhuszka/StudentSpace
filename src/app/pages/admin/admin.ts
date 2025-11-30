import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { Router } from '@angular/router';

import { AvatarComponent } from '@components/avatar/avatar.component';
import { AdminService, User, UserStats } from '@services/admin.service';
import { ProfessionService, Profession, ProfessionStats } from '@services/profession.service';
import { SubjectService, Subject } from '@services/subject.service';
import { AuthService } from '@services/auth-service';

@Component({
  selector: 'app-admin',
  imports: [
    CommonModule,
    FormsModule,
    NzLayoutModule,
    NzCardModule,
    NzStatisticModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzTagModule,
    NzSpaceModule,
    NzBadgeModule,
    NzDividerModule,
    NzSelectModule,
    NzPopconfirmModule,
    NzInputModule,
    NzTabsModule,
    AvatarComponent,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  private adminService = inject(AdminService);
  private professionService = inject(ProfessionService);
  private subjectService = inject(SubjectService);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private router = inject(Router);

  // Statistics
  userStats = signal<UserStats>({
    totalUsers: 0,
    activeUsers: 0,
    adminUsers: 0,
    teacherUsers: 0,
  });
  professionStats = signal<ProfessionStats>({
    totalProfessions: 0,
    totalSubjects: 0,
    totalModules: 0,
    averageSubjectsPerProfession: 0,
  });

  // Data
  users = signal<User[]>([]);
  professions = signal<Profession[]>([]);
  subjects = signal<Subject[]>([]);
  filteredUsers = computed(() => {
    const search = this.userSearchTerm().toLowerCase();
    return this.users().filter(
      (u) =>
        u.username.toLowerCase().includes(search) ||
        u.fullName.toLowerCase().includes(search) ||
        (u.email && u.email.toLowerCase().includes(search))
    );
  });

  // UI State
  loading = signal(false);
  selectedTab = signal(0);
  userSearchTerm = signal('');

  // Modal state for user editing
  isUserModalVisible = signal(false);
  editingUser = signal<User | null>(null);
  availableRoles = ['USER', 'TEACHER', 'ADMIN', 'SUPERADMIN'];
  selectedRoles: string[] = [];

  // Check if current user is superadmin
  isSuperAdmin = computed(() => {
    return this.authService.userRoles().includes('SUPERADMIN');
  });

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading.set(true);

    // Load statistics
    this.professionService.getProfessionStats().subscribe({
      next: (stats) => this.professionStats.set(stats),
      error: (err) => console.error('Error loading profession stats:', err),
    });

    // Load professions
    this.professionService.getAll().subscribe({
      next: (data) => this.professions.set(data),
      error: (err) => console.error('Error loading professions:', err),
    });

    // Load subjects
    this.subjectService.getAllSubjects().subscribe({
      next: (data) => this.subjects.set(data),
      error: (err) => console.error('Error loading subjects:', err),
    });

    // Load users and stats only for superadmin
    if (this.isSuperAdmin()) {
      this.adminService.getUserStats().subscribe({
        next: (stats) => this.userStats.set(stats),
        error: (err) => console.error('Error loading user stats:', err),
      });

      this.adminService.getAll().subscribe({
        next: (data) => {
          this.users.set(data);
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading users:', err);
          this.loading.set(false);
        },
      });
    } else {
      this.loading.set(false);
    }
  }

  // User management methods
  openEditUserModal(user: User) {
    this.editingUser.set(user);
    this.selectedRoles = [...user.roles];
    this.isUserModalVisible.set(true);
  }

  closeUserModal() {
    this.isUserModalVisible.set(false);
    this.editingUser.set(null);
    this.selectedRoles = [];
  }

  saveUserRoles() {
    const user = this.editingUser();
    if (!user) return;

    this.adminService.updateUserRoles(user.id, this.selectedRoles).subscribe({
      next: () => {
        this.message.success('User roles updated successfully');
        // Update local user data
        const updatedUsers = this.users().map((u) =>
          u.id === user.id ? { ...u, roles: this.selectedRoles } : u
        );
        this.users.set(updatedUsers);
        this.closeUserModal();
      },
      error: (err) => {
        console.error('Error updating user roles:', err);
        this.message.error('Failed to update user roles');
      },
    });
  }

  toggleUserStatus(user: User) {
    this.adminService.toggleUserStatus(user.id).subscribe({
      next: () => {
        const status = user.enabled ? 'disabled' : 'enabled';
        this.message.success(`User ${status} successfully`);
        // Update local user data
        const updatedUsers = this.users().map((u) =>
          u.id === user.id ? { ...u, enabled: !u.enabled } : u
        );
        this.users.set(updatedUsers);
      },
      error: (err) => {
        console.error('Error toggling user status:', err);
        this.message.error('Failed to update user status');
      },
    });
  }

  deleteUser(userId: string) {
    this.adminService.delete(userId).subscribe({
      next: () => {
        this.message.success('User deleted successfully');
        this.users.set(this.users().filter((u) => u.id !== userId));
      },
      error: (err) => {
        console.error('Error deleting user:', err);
        this.message.error('Failed to delete user');
      },
    });
  }

  // Navigation methods
  viewProfession(professionId: number) {
    this.router.navigate(['/selected-profession', professionId]);
  }

  goToHome() {
    this.router.navigate(['/home']);
  }

  getRoleColor(role: string): string {
    const colorMap: Record<string, string> = {
      SUPERADMIN: 'red',
      ADMIN: 'orange',
      TEACHER: 'blue',
      USER: 'default',
    };
    return colorMap[role] || 'default';
  }
}

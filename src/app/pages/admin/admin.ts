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
import { NzFormModule } from 'ng-zorro-antd/form';
import { Router } from '@angular/router';

import { AvatarComponent } from '@components/avatar/avatar.component';
import { AdminService, User, UserStats } from '@services/admin.service';
import { ProfessionService, Profession, ProfessionStats } from '@services/profession.service';
import { SubjectService, Subject } from '@services/subject.service';
import { AuthService } from '@services/auth-service';
import { QuizService, Quiz } from '@services/quiz.service';

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
    NzFormModule,
    AvatarComponent,
  ],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class Admin implements OnInit {
  private adminService = inject(AdminService);
  private professionService = inject(ProfessionService);
  private subjectService = inject(SubjectService);
  private quizService = inject(QuizService);
  private authService = inject(AuthService);
  private message = inject(NzMessageService);
  private router = inject(Router);

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

  users = signal<User[]>([]);
  professions = signal<Profession[]>([]);
  subjects = signal<Subject[]>([]);
  quizzes = signal<Quiz[]>([]);
  filteredUsers = computed(() => {
    const search = this.userSearchTerm().toLowerCase();
    return this.users().filter(
      (u) =>
        u.username.toLowerCase().includes(search) ||
        u.fullName.toLowerCase().includes(search) ||
        (u.email && u.email.toLowerCase().includes(search)),
    );
  });

  loading = signal(false);
  selectedTab = signal(0);
  userSearchTerm = signal('');

  isUserModalVisible = signal(false);
  editingUser = signal<User | null>(null);
  availableRoles = ['USER', 'TEACHER', 'ADMIN', 'SUPERADMIN'];
  selectedRoles: string[] = [];

  isQuizModalVisible = signal(false);
  editingQuiz = signal<Quiz | null>(null);
  quizForm: {
    title: string;
    description: string;
    subjectId: string | null;
    timeLimit: number | null;
    passingScore: number;
    isActive: boolean;
    questions: Array<{
      type: string;
      question: string;
      options: string;
      correctAnswer: string;
      points: number;
    }>;
  } = {
    title: '',
    description: '',
    subjectId: null,
    timeLimit: null,
    passingScore: 60,
    isActive: true,
    questions: [],
  };

  isSuperAdmin = computed(() => {
    return this.authService.userRoles().includes('SUPERADMIN');
  });

  ngOnInit() {
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loading.set(true);

    this.professionService.getProfessionStats().subscribe({
      next: (stats) => this.professionStats.set(stats),
      error: (err) => console.error('Error loading profession stats:', err),
    });

    this.professionService.getAll().subscribe({
      next: (data) => this.professions.set(data),
      error: (err) => console.error('Error loading professions:', err),
    });

    this.subjectService.getAllSubjects().subscribe({
      next: (data) => this.subjects.set(data),
      error: (err) => console.error('Error loading subjects:', err),
    });

    if (this.isSuperAdmin()) {
      this.adminService.getUserStats().subscribe({
        next: (stats) => this.userStats.set(stats),
        error: (err) => console.error('Error loading user stats:', err),
      });

      this.loadAllQuizzes();

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

  loadAllQuizzes() {
    this.quizService.getAllAdmin().subscribe({
      next: (data) => this.quizzes.set(data),
      error: (err) => console.error('Error loading quizzes:', err),
    });
  }

  openQuizModal(quiz?: Quiz) {
    if (quiz) {
      this.editingQuiz.set(quiz);
      this.quizForm = {
        title: quiz.title,
        description: quiz.description,
        subjectId: quiz.subjectId || null,
        timeLimit: quiz.timeLimit || null,
        passingScore: quiz.passingScore,
        isActive: quiz.isActive,
        questions:
          quiz.questions?.map((q) => ({
            type: q.type,
            question: q.question,
            options: q.options || '[]',
            correctAnswer: q.correctAnswer,
            points: q.points,
          })) || [],
      };
    } else {
      this.editingQuiz.set(null);
      this.quizForm = {
        title: '',
        description: '',
        subjectId: null,
        timeLimit: null,
        passingScore: 60,
        isActive: true,
        questions: [],
      };
    }
    this.isQuizModalVisible.set(true);
  }

  closeQuizModal() {
    this.isQuizModalVisible.set(false);
    this.editingQuiz.set(null);
  }

  addQuestion() {
    this.quizForm.questions.push({
      type: 'MULTIPLE_CHOICE',
      question: '',
      options: '["Option 1", "Option 2"]',
      correctAnswer: '',
      points: 1,
    });
  }

  removeQuestion(index: number) {
    this.quizForm.questions.splice(index, 1);
  }

  saveQuiz() {
    if (!this.quizForm.title || !this.quizForm.subjectId) {
      this.message.error('Please fill in required fields (Title, Subject)');
      return;
    }

    const quizData: Partial<Quiz> = {
      ...this.quizForm,
    } as any;

    if (this.editingQuiz()) {
      quizData.id = this.editingQuiz()!.id;
      this.quizService.update(quizData).subscribe({
        next: () => {
          this.message.success('Quiz updated successfully');
          this.loadAllQuizzes();
          this.closeQuizModal();
        },
        error: (err) => {
          console.error('Error updating quiz:', err);
          this.message.error('Failed to update quiz');
        },
      });
    } else {
      this.quizService.create(quizData).subscribe({
        next: () => {
          this.message.success('Quiz created successfully');
          this.loadAllQuizzes();
          this.closeQuizModal();
        },
        error: (err) => {
          console.error('Error creating quiz:', err);
          this.message.error('Failed to create quiz');
        },
      });
    }
  }

  deleteQuiz(id: string) {
    this.quizService.delete(id).subscribe({
      next: () => {
        this.message.success('Quiz deleted successfully');
        this.loadAllQuizzes();
      },
      error: (err) => {
        console.error('Error deleting quiz:', err);
        this.message.error('Failed to delete quiz');
      },
    });
  }

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

        const updatedUsers = this.users().map((u) =>
          u.id === user.id ? { ...u, roles: this.selectedRoles } : u,
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

        const updatedUsers = this.users().map((u) =>
          u.id === user.id ? { ...u, enabled: !u.enabled } : u,
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

import { Component, computed, inject, Input, signal, WritableSignal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { Module, Subject } from '@components/subject-card/subject-card.component';
import { AuthService } from '@services/auth-service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';
import { SubjectService } from '@services/subject.service';

import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { MarkdownModule } from 'ngx-markdown';

import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';
import { HttpClient } from '@angular/common/http';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Profession } from '@pages/home/home';
import { Router } from '@angular/router';
import { Quiz } from '@services/quiz.service';

@Component({
  selector: 'app-selected-profession-layout',
  templateUrl: './selected-profession.layout.html',
  styleUrls: ['./selected-profession.layout.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzLayoutModule,
    NzMenuModule,
    AvatarComponent,
    NzBreadCrumbModule,
    NzIconModule,
    NzSpinModule,
    NzButtonModule,
    NzModalModule,
    NzSelectModule,
    NzFormModule,
    NzInputModule,
    NzTabsModule,
    NzCheckboxModule,
    MarkdownModule,
  ],
})
export class SelectedProfessionLayout {
  @Input() isLoading: boolean = false;
  @Input() loadError: string | null = null;
  @Input() professionSubjects: WritableSignal<Subject[]> = signal<Subject[]>([]);
  @Input() selectedModule: WritableSignal<Module | null> = signal<Module | null>(null);
  @Input() pdfBlobUrl: WritableSignal<SafeResourceUrl | null> = signal<SafeResourceUrl | null>(
    null,
  );
  @Input() showForumView: WritableSignal<boolean> = signal<boolean>(false);
  @Input() selectedProfession: WritableSignal<Profession | null> = signal<Profession | null>(null);
  @Input() subjectQuizzes: WritableSignal<Map<number, Quiz[]>> = signal<Map<number, Quiz[]>>(
    new Map(),
  );

  @Input() selectModule: (module: Module) => void = () => {};
  @Input() navigateToQuiz: (quizId: string) => void = () => {};

  private apiUrl = environment.apiUrl;

  isEditMode = signal(false);
  isCollapsed = false;
  isSubjectModalVisible = signal(false);
  isModuleModalVisible = signal(false);
  isEditingSubject = signal(false);
  isEditingModule = signal(false);
  isLinkSubjectModalVisible = signal(false);
  subjectForm!: FormGroup;
  moduleForm!: FormGroup;
  selectedSubjectId: number | null = null;
  selectedModuleId: string | null = null;
  currentSubjectForModule: Subject | null = null;
  modulePreviewContent = signal<string>('');
  selectedSubjectToLink: number | null = null;
  selectedFileName = signal<string>('');
  selectedFile: File | null = null;
  availableSubjects = signal<Subject[]>([]);

  private fb = inject(FormBuilder);

  constructor(
    private authService: AuthService,
    private confirmDialog: ConfirmDialogService,
    private subjectService: SubjectService,
    private message: NzMessageService,
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private router: Router,
  ) {
    this.initForms();
  }

  private initForms() {
    this.subjectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      createForum: [true],
    });

    this.moduleForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      content: [''],
      moduleType: ['MD', [Validators.required]],
    });

    this.moduleForm.get('content')?.valueChanges.subscribe((value) => {
      this.modulePreviewContent.set(value || '');
    });

    this.moduleForm.get('moduleType')?.valueChanges.subscribe((type) => {
      const contentControl = this.moduleForm.get('content');
      if (type === 'MD') {
        contentControl?.setValidators([Validators.required]);
      } else {
        contentControl?.clearValidators();
      }
      contentControl?.updateValueAndValidity();
    });
  }

  toggleEditMode() {
    this.isEditMode.update((v) => !v);
  }

  canEdit = computed(() => {
    const roles = this.authService.userRoles();
    return roles.includes('ADMIN') || roles.includes('SUPERADMIN') || roles.includes('TEACHER');
  });

  async deleteModule(module: Module, subject: Subject, event: Event) {
    event.stopPropagation();

    const confirmed = await this.confirmDialog.confirmDelete(module.title);
    if (!confirmed) return;

    this.subjectService.deleteModule(module.id).subscribe({
      next: () => {
        this.message.success('Module deleted successfully!');

        this.professionSubjects.update((subjects) =>
          subjects.map((s) =>
            s.id === subject.id ? { ...s, module: s.module.filter((m) => m.id !== module.id) } : s,
          ),
        );

        if (this.selectedModule()?.id === module.id) {
          this.selectedModule.set(null);
        }
      },
      error: (error) => {
        console.error('Error deleting module:', error);
        this.message.error('Failed to delete module. Please try again.');
      },
    });
  }

  private cleanupPdfBlob(): void {
    const currentUrl = this.pdfBlobUrl();
    if (currentUrl) {
      const urlString = (currentUrl as any).changingThisBreaksApplicationSecurity;
      if (urlString && urlString.startsWith('blob:')) {
        URL.revokeObjectURL(urlString);
      }
      this.pdfBlobUrl.set(null);
    }
  }

  openAddSubjectModal() {
    this.isEditingSubject.set(false);
    this.selectedSubjectId = null;
    this.subjectForm.reset();
    this.isSubjectModalVisible.set(true);
  }

  openEditSubjectModal(subject: Subject) {
    this.isEditingSubject.set(true);
    this.selectedSubjectId = subject.id;
    this.subjectForm.patchValue({
      name: subject.name,
      description: subject.description,
    });
    this.isSubjectModalVisible.set(true);
  }

  handleSubjectCancel() {
    this.isSubjectModalVisible.set(false);
    this.subjectForm.reset();
    this.selectedSubjectId = null;
  }

  handleSubjectSubmit() {
    if (this.subjectForm.invalid) {
      Object.values(this.subjectForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    const subjectData = {
      ...this.subjectForm.value,
      professions: [{ id: this.selectedProfession()?.id }],
    };

    if (this.isEditingSubject()) {
      this.updateSubject(subjectData);
    } else {
      this.addSubject(subjectData);
    }
  }

  private addSubject(data: any) {
    const subjectData = {
      name: data.name,
      description: data.description,
      professions: data.professions,
      createForum: data.createForum ?? false,
    };

    this.http
      .post(`${this.apiUrl}/subjects`, subjectData, {
        observe: 'response',
        responseType: 'text',
      })
      .subscribe({
        next: (response) => {
          this.message.success('Subject added successfully!');

          const newSubjectId = response.body ? parseInt(response.body) : Date.now();
          const newSubject: Subject = {
            id: newSubjectId,
            name: data.name,
            description: data.description,
            professions: data.professions,
            module: [],
          };
          this.professionSubjects.update((subjects) => [...subjects, newSubject]);
          this.handleSubjectCancel();
        },
        error: (error) => {
          console.error('Error adding subject:', error);
          this.message.error('Failed to add subject. Please try again.');
        },
      });
  }

  private updateSubject(data: any) {
    if (!this.selectedSubjectId) return;

    const subjectData = {
      ...data,
      id: this.selectedSubjectId,
    };

    this.http
      .put(`${this.apiUrl}/subjects`, subjectData, {
        observe: 'response',
        responseType: 'text',
      })
      .subscribe({
        next: () => {
          this.message.success('Subject updated successfully!');

          this.professionSubjects.update((subjects) =>
            subjects.map((s) =>
              s.id === this.selectedSubjectId
                ? { ...s, name: data.name, description: data.description }
                : s,
            ),
          );
          this.handleSubjectCancel();
        },
        error: (error) => {
          console.error('Error updating subject:', error);
          this.message.error('Failed to update subject. Please try again.');
        },
      });
  }

  async deleteSubject(subject: Subject, event: Event) {
    event.stopPropagation();

    const confirmed = await this.confirmDialog.confirmDelete(subject.name);
    if (!confirmed) return;

    this.subjectService.deleteSubject(subject.id).subscribe({
      next: () => {
        this.message.success('Subject deleted successfully!');

        this.professionSubjects.update((subjects) => subjects.filter((s) => s.id !== subject.id));

        if (
          this.selectedModule() &&
          subject.module.some((m) => m.id === this.selectedModule()?.id)
        ) {
          this.selectedModule.set(null);
        }
      },
      error: (error) => {
        console.error('Error deleting subject:', error);
        this.message.error('Failed to delete subject. Please try again.');
      },
    });
  }

  openAddModuleModal(subject: Subject) {
    this.isEditingModule.set(false);
    this.selectedModuleId = null;
    this.currentSubjectForModule = subject;
    this.moduleForm.reset({ moduleType: 'MD' });
    this.modulePreviewContent.set('');
    this.clearFile();
    this.isModuleModalVisible.set(true);
  }

  openEditModuleModal(module: Module, subject: Subject) {
    this.isEditingModule.set(true);
    this.selectedModuleId = module.id;
    this.currentSubjectForModule = subject;

    this.moduleForm.patchValue({
      title: module.title,
      moduleType: module.moduleType,
      content: '',
    });

    this.isModuleModalVisible.set(true);

    if (module.moduleType === 'MD') {
      this.http.get<{ content: string }>(`${this.apiUrl}/modules/${module.id}`).subscribe({
        next: (response) => {
          const content = response.content || '';
          this.moduleForm.patchValue({ content });
          this.modulePreviewContent.set(content);
        },
        error: (error) => {
          console.error('Error loading module content:', error);
          this.message.error('Failed to load module content');
        },
      });
      this.clearFile();
    } else if (module.moduleType === 'PDF') {
      this.selectedFileName.set('Existing PDF file');
      this.modulePreviewContent.set('');
    }
  }

  handleModuleCancel() {
    this.isModuleModalVisible.set(false);
    this.moduleForm.reset();
    this.modulePreviewContent.set('');
    this.clearFile();
    this.selectedModuleId = null;
    this.currentSubjectForModule = null;
  }

  handleModuleSubmit() {
    if (this.moduleForm.invalid) {
      Object.values(this.moduleForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    if (
      this.moduleForm.value.moduleType === 'PDF' &&
      !this.isEditingModule() &&
      !this.selectedFile
    ) {
      this.message.error('Please select a PDF file to upload');
      return;
    }

    const moduleData = {
      ...this.moduleForm.value,
      subjectId: this.currentSubjectForModule?.id,
      content:
        this.moduleForm.value.moduleType === 'PDF' && this.selectedFile
          ? this.selectedFile
          : this.moduleForm.value.content,
    };

    if (this.isEditingModule()) {
      this.updateModule(moduleData);
    } else {
      this.addModule(moduleData);
    }
  }

  private addModule(data: any) {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('moduleType', data.moduleType);
    formData.append('subjectId', data.subjectId.toString());

    if (data.moduleType === 'MD') {
      formData.append('content', data.content || '');
    } else if (data.moduleType === 'PDF' && this.selectedFile) {
      formData.append('pdfFile', this.selectedFile, this.selectedFile.name);
    }

    this.http
      .post(`${this.apiUrl}/modules`, formData, {
        observe: 'response',
        responseType: 'text',
      })
      .subscribe({
        next: (response) => {
          this.message.success('Module added successfully!');

          const newModuleId = response.body || crypto.randomUUID();
          const newModule: Module = {
            id: newModuleId,
            title: data.title,
            content: data.content,
            moduleType: data.moduleType,
          };
          this.professionSubjects.update((subjects) =>
            subjects.map((s) =>
              s.id === this.currentSubjectForModule?.id
                ? { ...s, module: [...s.module, newModule] }
                : s,
            ),
          );
          this.handleModuleCancel();
        },
        error: (error) => {
          console.error('Error adding module:', error);
          this.message.error('Failed to add module. Please try again.');
        },
      });
  }

  private updateModule(data: any) {
    if (!this.selectedModuleId) return;

    const formData = new FormData();
    formData.append('id', this.selectedModuleId);
    formData.append('title', data.title);
    formData.append('moduleType', data.moduleType);
    formData.append('subjectId', data.subjectId.toString());

    if (data.moduleType === 'MD') {
      formData.append('content', data.content || '');
    } else if (data.moduleType === 'PDF' && this.selectedFile) {
      formData.append('pdfFile', this.selectedFile, this.selectedFile.name);
    }

    this.http
      .put(`${this.apiUrl}/modules`, formData, {
        observe: 'response',
        responseType: 'text',
      })
      .subscribe({
        next: () => {
          this.message.success('Module updated successfully!');

          this.professionSubjects.update((subjects) =>
            subjects.map((s) =>
              s.id === this.currentSubjectForModule?.id
                ? {
                    ...s,
                    module: s.module.map((m) =>
                      m.id === this.selectedModuleId
                        ? {
                            ...m,
                            title: data.title,
                            content: data.content,
                            moduleType: data.moduleType,
                          }
                        : m,
                    ),
                  }
                : s,
            ),
          );

          if (this.selectedModule()?.id === this.selectedModuleId) {
            this.selectedModule.set({
              id: this.selectedModuleId,
              title: data.title,
              content: data.content,
              moduleType: data.moduleType,
            });
          }
          this.handleModuleCancel();
        },
        error: (error) => {
          console.error('Error updating module:', error);
          this.message.error('Failed to update module. Please try again.');
        },
      });
  }

  openLinkSubjectModal() {
    this.selectedSubjectToLink = null;
    this.loadAllSubjects();
    this.isLinkSubjectModalVisible.set(true);
  }

  handleLinkSubjectCancel() {
    this.isLinkSubjectModalVisible.set(false);
    this.selectedSubjectToLink = null;
  }

  handleLinkSubjectSubmit() {
    if (!this.selectedSubjectToLink || !this.selectedProfession()?.id) {
      this.message.error('Please select a subject to link');
      return;
    }

    this.linkSubjectToProfession(this.selectedSubjectToLink, this.selectedProfession()!.id);
  }

  clearFile() {
    this.selectedFile = null;
    this.selectedFileName.set('');
    this.moduleForm.patchValue({ content: '' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  private loadAllSubjects() {
    this.http.get<Subject[]>(`${this.apiUrl}/subjects`).subscribe({
      next: (subjects) => {
        const currentSubjectIds = this.professionSubjects().map((s) => s.id);
        const available = subjects.filter((s) => !currentSubjectIds.includes(s.id));
        this.availableSubjects.set(available);
      },
      error: (error) => {
        console.error('Error loading subjects:', error);
        this.message.error('Failed to load subjects');
      },
    });
  }

  private linkSubjectToProfession(subjectId: number, professionId: number) {
    this.http
      .put(
        `${this.apiUrl}/subjects/link-subject-to-profession?subjectId=${subjectId}&professionId=${professionId}`,
        null,
        {
          observe: 'response',
          responseType: 'text',
        },
      )
      .subscribe({
        next: () => {
          this.message.success('Subject linked successfully!');

          const linkedSubject = this.availableSubjects().find((s) => s.id === subjectId);
          if (linkedSubject) {
            this.professionSubjects.update((subjects) => [...subjects, linkedSubject]);
          }
          this.handleLinkSubjectCancel();
        },
        error: (error) => {
          console.error('Error linking subject:', error);
          this.message.error('Failed to link subject. Please try again.');
        },
      });
  }

  async unlinkSubjectFromProfession(subject: Subject, event: Event) {
    event.stopPropagation();

    const confirmed = await this.confirmDialog.confirm(
      'Unlink Subject',
      `Are you sure you want to unlink "${subject.name}" from this profession?`,
    );
    if (!confirmed) return;

    if (!this.selectedProfession()?.id) {
      this.message.error('No profession selected');
      return;
    }

    this.subjectService
      .unlinkSubjectFromProfession(subject.id, this.selectedProfession()!.id)
      .subscribe({
        next: () => {
          this.message.success('Subject unlinked successfully!');

          this.professionSubjects.update((subjects) => subjects.filter((s) => s.id !== subject.id));

          if (
            this.selectedModule() &&
            subject.module.some((m) => m.id === this.selectedModule()?.id)
          ) {
            this.selectedModule.set(null);
          }
        },
        error: (error) => {
          console.error('Error unlinking subject:', error);
          this.message.error('Failed to unlink subject. Please try again.');
        },
      });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      if (!file.type.includes('pdf')) {
        this.message.error('Please select a PDF file');
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.message.error('File size must be less than 10MB');
        return;
      }

      this.selectedFile = file;
      this.selectedFileName.set(file.name);
      this.moduleForm.patchValue({ content: file });
      this.message.success('File selected successfully');
    }
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }
}

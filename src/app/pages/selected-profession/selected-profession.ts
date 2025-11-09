import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import {
  Component,
  signal,
  computed,
  inject,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { AvatarComponent } from '../../components/avatar/avatar.component';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '@services/auth-service';
import { environment } from 'src/environments/environment';
import { Profession } from '@pages/home/home';
import { MarkdownModule } from 'ngx-markdown';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';

// Import new reusable components and services
import { SubjectModalComponent } from '@components/subject-modal/subject-modal.component';
import {
  ModuleModalComponent,
  ModuleFormData,
} from '@components/module-modal/module-modal.component';
import { SubjectService } from '@services/subject.service';
import { ConfirmDialogService } from '@services/confirm-dialog.service';

interface Subject {
  id: number;
  name: string;
  description: string;
  professions: Profession[];
  module: Module[];
  forum?: Forum;
}

interface Module {
  id: string;
  title: string;
  content: string | File;
  moduleType: 'MD' | 'PDF';
}

interface Forum {
  forumMessages: any[];
  id: string;
}

@Component({
  selector: 'app-selected-profession',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    NzLayoutModule,
    NzMenuModule,
    AvatarComponent,
    NzBreadCrumbModule,
    NzIconModule,
    MarkdownModule,
    NzSpinModule,
    NzButtonModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTabsModule,
    NzToolTipModule,
    NzCheckboxModule,
    ReactiveFormsModule,
    FormsModule,
  ],
  templateUrl: './selected-profession.html',
  styleUrl: './selected-profession.scss',
})
export class SelectedProfession implements OnDestroy {
  protected readonly date = new Date();
  isCollapsed = false;
  private apiUrl = environment.apiUrl;
  private fb = inject(FormBuilder);
  private message = inject(NzMessageService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  // New service injections
  private subjectService = inject(SubjectService);
  private confirmDialog = inject(ConfirmDialogService);

  professionSubjects = signal<Subject[]>([]);
  selectedProfession = signal<Profession | null>(null);
  selectedModule = signal<Module | null>(null);

  // Computed property for markdown content (memoized)
  markdownContent = computed(() => {
    const module = this.selectedModule();
    if (!module?.content) {
      return undefined;
    }
    return typeof module.content === 'string' ? module.content : undefined;
  });

  isLoading = signal(true);
  loadError = signal<string | null>(null);

  // Edit mode state
  isEditMode = signal(false);
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

  // Module preview content signal for better performance
  modulePreviewContent = signal<string>('');

  // PDF file upload
  selectedFile: File | null = null;
  selectedFileName = signal<string>('');

  // PDF blob URL for viewing (with authentication)
  pdfBlobUrl = signal<SafeResourceUrl | null>(null);

  // Available subjects for linking
  availableSubjects = signal<Subject[]>([]);
  selectedSubjectToLink: number | null = null;

  // Forum view state
  showForumView = signal(false);

  // Check if user can edit (ADMIN, SUPERADMIN, or TEACHER)
  canEdit = computed(() => {
    const roles = this.authService.userRoles();
    return roles.includes('ADMIN') || roles.includes('SUPERADMIN') || roles.includes('TEACHER');
  });

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.initForms();
    this.route.params.subscribe((params) => {
      this.loadData(params['id']);
    });
  }

  private initForms() {
    this.subjectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      createForum: [true], // Default to true for new subjects
    });

    this.moduleForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      content: [''],
      moduleType: ['MD', [Validators.required]],
    });

    // Update preview content on form changes (with built-in debouncing via signals)
    this.moduleForm.get('content')?.valueChanges.subscribe((value) => {
      this.modulePreviewContent.set(value || '');
    });

    // Update content validation based on module type
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

  private loadData(professionId: string): void {
    this.isLoading.set(true);
    this.loadError.set(null);

    const subjects$ = this.http.get<Subject[]>(
      `${this.apiUrl}/subjects/by-profession/${professionId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const profession$ = this.http.get<Profession>(`${this.apiUrl}/professions/${professionId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    forkJoin({
      subjects: subjects$,
      profession: profession$,
    })
      .pipe(
        finalize(() => {
          console.log('Finalize called - setting isLoading to false');
          this.isLoading.set(false);
        })
      )
      .subscribe({
        next: (result) => {
          console.log('Data loaded successfully:', result);

          result.subjects.sort((a, b) => {
            const [aTitle, aNum] = a.name.split(' - ');
            const [bTitle, bNum] = b.name.split(' - ');

            if (aTitle !== bTitle) {
              return aTitle.localeCompare(bTitle, 'hu');
            }

            return parseInt(aNum) - parseInt(bNum);
          });

          this.professionSubjects.set(result.subjects);
          this.selectedProfession.set(result.profession);
        },
        error: (error) => {
          console.error('Error loading data:', error);
          this.loadError.set('Failed to load profession data. Please try again.');
        },
      });
  }

  selectModule(module: Module) {
    // Toggle selection - if clicking the same module, deselect it
    if (this.selectedModule()?.id === module.id) {
      this.selectedModule.set(null);
      this.cleanupPdfBlob();
      return;
    }

    this.selectedModule.set(module);
    this.showForumView.set(false); // Close forum view when selecting a module

    // If it's a PDF module, load the PDF blob with authentication
    if (module.moduleType === 'PDF') {
      this.loadPdfBlob(module.id);
    } else {
      // Clean up previous PDF blob URL if switching from PDF to MD
      this.cleanupPdfBlob();
    }
  }

  // Get PDF URL for downloading
  getPdfUrl(moduleId: string): string {
    return `${this.apiUrl}/modules/${moduleId}/pdf`;
  }

  // Load PDF as blob with authentication headers
  private loadPdfBlob(moduleId: string): void {
    // Clean up previous blob URL
    this.cleanupPdfBlob();

    this.http
      .get(`${this.apiUrl}/modules/${moduleId}/pdf`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          // Create object URL from blob
          const url = URL.createObjectURL(blob);
          const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.pdfBlobUrl.set(safeUrl);
        },
        error: (error) => {
          console.error('Error loading PDF:', error);
          this.message.error('Failed to load PDF file');
          this.pdfBlobUrl.set(null);
        },
      });
  }

  // Clean up blob URL to prevent memory leaks
  private cleanupPdfBlob(): void {
    const currentUrl = this.pdfBlobUrl();
    if (currentUrl) {
      // Extract the blob URL from SafeResourceUrl
      const urlString = (currentUrl as any).changingThisBreaksApplicationSecurity;
      if (urlString && urlString.startsWith('blob:')) {
        URL.revokeObjectURL(urlString);
      }
      this.pdfBlobUrl.set(null);
    }
  }

  // Download PDF with authentication
  downloadPdf(moduleId: string, fileName: string): void {
    this.http
      .get(`${this.apiUrl}/modules/${moduleId}/pdf`, {
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName || 'document.pdf';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        },
        error: (error) => {
          console.error('Error downloading PDF:', error);
          this.message.error('Failed to download PDF file');
        },
      });
  }

  toggleEditMode() {
    this.isEditMode.update((v) => !v);
  }

  // File upload methods
  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validate file type
      if (!file.type.includes('pdf')) {
        this.message.error('Please select a PDF file');
        return;
      }

      // Validate file size (10MB)
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

  clearFile() {
    this.selectedFile = null;
    this.selectedFileName.set('');
    this.moduleForm.patchValue({ content: '' });
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Subject modal methods
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
          // Parse the returned ID and add the new subject to local state
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
          // Update the subject in local state
          this.professionSubjects.update((subjects) =>
            subjects.map((s) =>
              s.id === this.selectedSubjectId
                ? { ...s, name: data.name, description: data.description }
                : s
            )
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
        // Remove the subject from local state
        this.professionSubjects.update((subjects) => subjects.filter((s) => s.id !== subject.id));
        // Clear selected module if it belongs to the deleted subject
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

  // Module modal methods
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

    // Pre-populate basic fields immediately
    this.moduleForm.patchValue({
      title: module.title,
      moduleType: module.moduleType,
      content: '', // Will be loaded for MD modules
    });

    this.isModuleModalVisible.set(true);

    // For MD modules, fetch the full content from server
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
      // For PDF modules, just show the filename indicator
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

    // Validate PDF file upload (only required when adding new PDF module)
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
    // Use FormData for multipart upload
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
          // Parse the returned ID and add the new module to local state
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
                : s
            )
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

    // Use FormData for multipart upload
    const formData = new FormData();
    formData.append('id', this.selectedModuleId);
    formData.append('title', data.title);
    formData.append('moduleType', data.moduleType);
    formData.append('subjectId', data.subjectId.toString());

    if (data.moduleType === 'MD') {
      formData.append('content', data.content || '');
    } else if (data.moduleType === 'PDF' && this.selectedFile) {
      // Only append file if a new one was selected
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
          // Update the module in local state
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
                        : m
                    ),
                  }
                : s
            )
          );
          // Update selected module if it's the one being edited
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

  async deleteModule(module: Module, subject: Subject, event: Event) {
    event.stopPropagation();

    const confirmed = await this.confirmDialog.confirmDelete(module.title);
    if (!confirmed) return;

    this.subjectService.deleteModule(module.id).subscribe({
      next: () => {
        this.message.success('Module deleted successfully!');
        // Remove the module from local state
        this.professionSubjects.update((subjects) =>
          subjects.map((s) =>
            s.id === subject.id ? { ...s, module: s.module.filter((m) => m.id !== module.id) } : s
          )
        );
        // Clear selected module if it's the one being deleted
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

  // Link subject modal methods
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

  private loadAllSubjects() {
    this.http.get<Subject[]>(`${this.apiUrl}/subjects`).subscribe({
      next: (subjects) => {
        // Filter out subjects that are already linked to this profession
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
        }
      )
      .subscribe({
        next: () => {
          this.message.success('Subject linked successfully!');
          // Find the subject from available subjects and add it to profession subjects
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
      `Are you sure you want to unlink "${subject.name}" from this profession?`
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
          // Remove the subject from local state
          this.professionSubjects.update((subjects) => subjects.filter((s) => s.id !== subject.id));
          // Clear selected module if it belongs to the unlinked subject
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

  openForumList() {
    this.showForumView.set(true);
    this.selectedModule.set(null);
    this.cleanupPdfBlob();
  }

  closeForumView() {
    this.showForumView.set(false);
  }

  navigateToHome() {
    this.router.navigate(['/home']);
  }

  ngOnDestroy(): void {
    // Clean up blob URL to prevent memory leaks
    this.cleanupPdfBlob();
  }
}

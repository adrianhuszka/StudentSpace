import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { MarkdownModule } from 'ngx-markdown';
import { FileUploadService } from '@services/file-upload.service';

export interface Module {
  id: string;
  title: string;
  content: string | File;
  moduleType: 'MD' | 'PDF';
}

export interface ModuleFormData {
  title: string;
  content: string | File;
  moduleType: 'MD' | 'PDF';
}

@Component({
  selector: 'app-module-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzSelectModule,
    NzTabsModule,
    NzUploadModule,
    MarkdownModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="visible"
      [nzTitle]="isEditing ? 'Modul szerkesztése' : 'Új modul hozzáadása'"
      [nzOkText]="isEditing ? 'Mentés' : 'Létrehozás'"
      nzCancelText="Mégse"
      [nzWidth]="800"
      (nzOnCancel)="handleCancel()"
      (nzOnOk)="handleSubmit()"
      [nzOkDisabled]="!moduleForm.valid || (moduleType === 'PDF' && !isEditing && !selectedFile)"
    >
      <ng-container *nzModalContent>
        <form nz-form [formGroup]="moduleForm" nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>Modul címe</nz-form-label>
            <nz-form-control nzErrorTip="Add meg a modul címét (min. 3 karakter)">
              <input nz-input formControlName="title" placeholder="pl.: Bevezetés az algebrába" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Modul típusa</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="moduleType" [nzDisabled]="isEditing">
                <nz-option nzValue="MD" nzLabel="Markdown (szöveges tartalom)"></nz-option>
                <nz-option nzValue="PDF" nzLabel="PDF dokumentum"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <!-- Markdown Content -->
          <div *ngIf="moduleType === 'MD'">
            <nz-tabset>
              <nz-tab nzTitle="Szerkesztés">
                <nz-form-item>
                  <nz-form-label nzRequired>Tartalom (Markdown)</nz-form-label>
                  <nz-form-control nzErrorTip="Add meg a tartalmat">
                    <textarea
                      nz-input
                      formControlName="content"
                      [nzAutosize]="{ minRows: 10, maxRows: 20 }"
                      placeholder="# Cím&#10;&#10;Írd meg a tartalmat markdown formátumban..."
                    ></textarea>
                  </nz-form-control>
                </nz-form-item>
              </nz-tab>
              <nz-tab nzTitle="Előnézet">
                <div class="markdown-preview">
                  <markdown [data]="previewContent()"></markdown>
                </div>
              </nz-tab>
            </nz-tabset>
          </div>

          <!-- PDF Upload -->
          <div *ngIf="moduleType === 'PDF'">
            <nz-form-item>
              <nz-form-label [nzRequired]="!isEditing">PDF fájl</nz-form-label>
              <nz-form-control>
                <div class="file-upload">
                  <input
                    type="file"
                    accept=".pdf"
                    (change)="onFileSelected($event)"
                    #fileInput
                    style="display: none"
                  />
                  <button nz-button nzType="default" (click)="fileInput.click()">
                    <span nz-icon nzType="upload"></span>
                    PDF fájl kiválasztása
                  </button>
                  <span class="file-name" *ngIf="selectedFileName()">
                    {{ selectedFileName() }}
                    <button nz-button nzType="text" nzDanger nzSize="small" (click)="clearFile()">
                      <span nz-icon nzType="close"></span>
                    </button>
                  </span>
                  <span class="file-hint" *ngIf="!selectedFileName()"> Max. fájlméret: 10MB </span>
                </div>
              </nz-form-control>
            </nz-form-item>
          </div>
        </form>
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .markdown-preview {
        padding: 16px;
        border: 1px solid #d9d9d9;
        border-radius: 4px;
        min-height: 300px;
        max-height: 500px;
        overflow: auto;
      }

      .file-upload {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .file-name {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        background: #f0f0f0;
        border-radius: 4px;
      }

      .file-hint {
        color: #999;
        font-size: 12px;
      }
    `,
  ],
})
export class ModuleModalComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() isEditing = false;
  @Input() module: Module | null = null;

  @Output() onCancel = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<ModuleFormData>();

  private fb = inject(FormBuilder);
  private fileUploadService = inject(FileUploadService);

  moduleForm!: FormGroup;
  selectedFile: File | null = null;
  selectedFileName = signal<string>('');
  previewContent = signal<string>('');

  get moduleType(): 'MD' | 'PDF' {
    return this.moduleForm?.get('moduleType')?.value || 'MD';
  }

  ngOnInit(): void {
    this.initForm();
    this.setupFormListeners();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      if (this.module && this.isEditing) {
        this.loadModuleData();
      } else if (!this.isEditing) {
        this.moduleForm?.reset({ moduleType: 'MD' });
        this.clearFile();
      }
    }
  }

  private initForm(): void {
    this.moduleForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      content: [''],
      moduleType: ['MD', [Validators.required]],
    });
  }

  private setupFormListeners(): void {
    this.moduleForm.get('content')?.valueChanges.subscribe((value) => {
      this.previewContent.set(value || '');
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

  private loadModuleData(): void {
    if (!this.module) return;

    this.moduleForm.patchValue({
      title: this.module.title,
      moduleType: this.module.moduleType,
    });

    if (this.module.moduleType === 'MD' && typeof this.module.content === 'string') {
      this.moduleForm.patchValue({ content: this.module.content });
      this.previewContent.set(this.module.content);
    } else if (this.module.moduleType === 'PDF') {
      this.selectedFileName.set('Meglévő PDF fájl');
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const result = this.fileUploadService.handlePdfFile(file);

      if (result.valid && result.file) {
        this.selectedFile = result.file;
        this.selectedFileName.set(result.file.name);
        this.moduleForm.patchValue({ content: result.file });
      } else {
        input.value = '';
      }
    }
  }

  clearFile(): void {
    this.selectedFile = null;
    this.selectedFileName.set('');
    this.moduleForm.patchValue({ content: '' });
  }

  handleCancel(): void {
    this.moduleForm.reset({ moduleType: 'MD' });
    this.clearFile();
    this.previewContent.set('');
    this.onCancel.emit();
  }

  handleSubmit(): void {
    if (this.moduleForm.invalid) {
      Object.values(this.moduleForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    if (this.moduleType === 'PDF' && !this.isEditing && !this.selectedFile) {
      return;
    }

    const formData: ModuleFormData = {
      ...this.moduleForm.value,
      content:
        this.moduleType === 'PDF' && this.selectedFile
          ? this.selectedFile
          : this.moduleForm.value.content,
    };

    this.onSubmit.emit(formData);
    this.handleCancel();
  }
}

import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';

export interface Subject {
  id: number;
  name: string;
  description: string;
  forumId?: number;
}

@Component({
  selector: 'app-subject-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzButtonModule,
    NzCheckboxModule,
    NzIconModule,
  ],
  template: `
    <nz-modal
      [nzVisible]="visible"
      [nzTitle]="isEditing ? 'Edit Subject' : 'Add New Subject'"
      [nzOkText]="isEditing ? 'Update' : 'Create'"
      nzCancelText="Cancel"
      (nzOnCancel)="handleCancel()"
      (nzOnOk)="handleSubmit()"
      [nzOkDisabled]="!subjectForm.valid"
    >
      <ng-container *nzModalContent>
        <form nz-form [formGroup]="subjectForm" nzLayout="vertical">
          <nz-form-item>
            <nz-form-label nzRequired>Subject Name</nz-form-label>
            <nz-form-control nzErrorTip="Please enter subject name (min 3 characters)">
              <input nz-input formControlName="name" placeholder="e.g., Mathematics - Grade 1" />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Description</nz-form-label>
            <nz-form-control nzErrorTip="Please enter description (min 10 characters)">
              <textarea
                nz-input
                formControlName="description"
                [nzAutosize]="{ minRows: 3, maxRows: 6 }"
                placeholder="Brief description of the subject..."
              ></textarea>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item *ngIf="!isEditing">
            <nz-form-control>
              <label nz-checkbox formControlName="createForum">
                <span>Create a forum for this subject</span>
              </label>
              <div class="forum-hint">
                <span nz-icon nzType="info-circle" nzTheme="outline"></span>
                <span>Students can discuss and ask questions about this subject in the forum</span>
              </div>
            </nz-form-control>
          </nz-form-item>
        </form>
      </ng-container>
    </nz-modal>
  `,
  styles: [
    `
      .forum-hint {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(44, 116, 179, 0.05);
        border-left: 3px solid var(--color-accent, #2c74b3);
        border-radius: 4px;
        font-size: 13px;
        color: rgba(0, 0, 0, 0.65);

        span[nz-icon] {
          color: var(--color-accent, #2c74b3);
          font-size: 16px;
        }
      }
    `,
  ],
})
export class SubjectModalComponent implements OnInit {
  @Input() visible = false;
  @Input() isEditing = false;
  @Input() subject: Subject | null = null;

  @Output() onCancel = new EventEmitter<void>();
  @Output() onSubmit = new EventEmitter<Partial<Subject>>();

  private fb = inject(FormBuilder);
  subjectForm!: FormGroup;

  ngOnInit(): void {
    this.initForm();
  }

  ngOnChanges(): void {
    if (this.visible && this.subject && this.isEditing) {
      this.subjectForm?.patchValue({
        name: this.subject.name,
        description: this.subject.description,
      });
    } else if (this.visible && !this.isEditing) {
      this.subjectForm?.reset();
    }
  }

  private initForm(): void {
    this.subjectForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      createForum: [true], // Default to true for new subjects
    });
  }

  handleCancel(): void {
    this.subjectForm.reset();
    this.onCancel.emit();
  }

  handleSubmit(): void {
    if (this.subjectForm.invalid) {
      Object.values(this.subjectForm.controls).forEach((control) => {
        if (control.invalid) {
          control.markAsDirty();
          control.updateValueAndValidity({ onlySelf: true });
        }
      });
      return;
    }

    this.onSubmit.emit(this.subjectForm.value);
    this.subjectForm.reset();
  }
}

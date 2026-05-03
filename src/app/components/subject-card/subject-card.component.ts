import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { Profession } from '@pages/home/home';

export interface Subject {
  id: number;
  name: string;
  description: string;
  professions: Profession[];
  module: Module[];
  forum?: {
    id: string;
  };
}

export interface Module {
  id: string;
  title: string;
  content: string | File;
  moduleType: 'MD' | 'PDF';
}

export interface SubjectCardEvents {
  editSubject: Subject;
  deleteSubject: Subject;
  unlinkSubject: Subject;
  addModule: Subject;
  editModule: { module: Module; subject: Subject };
  deleteModule: { module: Module; subject: Subject };
  selectModule: Module;
}

@Component({
  selector: 'app-subject-card',
  standalone: true,
  imports: [CommonModule, NzCollapseModule, NzButtonModule, NzIconModule, NzToolTipModule],
  template: `
    <nz-collapse-panel [nzHeader]="subject.name" [nzActive]="active" [nzExtra]="actionsTemplate">
      <p class="subject-description">{{ subject.description }}</p>

      <div class="modules-section">
        <div class="modules-header">
          <h4>Modules ({{ subject.module.length }})</h4>
          <button
            *ngIf="canEdit"
            nz-button
            nzType="dashed"
            nzSize="small"
            (click)="onAddModule.emit(subject); $event.stopPropagation()"
          >
            <span nz-icon nzType="plus"></span>
            Add Module
          </button>
        </div>

        <div class="modules-list" *ngIf="subject.module && subject.module.length > 0">
          <div
            *ngFor="let module of subject.module"
            class="module-item"
            [class.selected]="selectedModuleId === module.id"
            (click)="onSelectModule.emit(module)"
          >
            <div class="module-info">
              <span
                nz-icon
                [nzType]="module.moduleType === 'MD' ? 'file-markdown' : 'file-pdf'"
              ></span>
              <span class="module-title">{{ module.title }}</span>
              <span class="module-type-badge">{{ module.moduleType }}</span>
            </div>
            <div class="module-actions" *ngIf="canEdit">
              <button
                nz-button
                nzType="text"
                nzSize="small"
                nz-tooltip="Edit"
                (click)="onEditModule.emit({ module, subject }); $event.stopPropagation()"
              >
                <span nz-icon nzType="edit"></span>
              </button>
              <button
                nz-button
                nzType="text"
                nzDanger
                nzSize="small"
                nz-tooltip="Delete"
                (click)="onDeleteModule.emit({ module, subject }); $event.stopPropagation()"
              >
                <span nz-icon nzType="delete"></span>
              </button>
            </div>
          </div>
        </div>

        <div class="no-modules" *ngIf="!subject.module || subject.module.length === 0">
          <span nz-icon nzType="inbox"></span>
          <p>No modules yet</p>
        </div>
      </div>

      <ng-template #actionsTemplate>
        <div class="subject-actions" *ngIf="canEdit" (click)="$event.stopPropagation()">
          <button
            nz-button
            nzType="text"
            nzSize="small"
            nz-tooltip="Edit Subject"
            (click)="onEditSubject.emit(subject); $event.stopPropagation()"
          >
            <span nz-icon nzType="edit"></span>
          </button>
          <button
            nz-button
            nzType="text"
            nzSize="small"
            nz-tooltip="Unlink from Profession"
            (click)="onUnlinkSubject.emit(subject); $event.stopPropagation()"
          >
            <span nz-icon nzType="disconnect"></span>
          </button>
          <button
            nz-button
            nzType="text"
            nzDanger
            nzSize="small"
            nz-tooltip="Delete Subject"
            (click)="onDeleteSubject.emit(subject); $event.stopPropagation()"
          >
            <span nz-icon nzType="delete"></span>
          </button>
        </div>
      </ng-template>
    </nz-collapse-panel>
  `,
  styles: [
    `
      .subject-description {
        color: #666;
        margin-bottom: 16px;
      }

      .modules-section {
        margin-top: 16px;
      }

      .modules-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .modules-header h4 {
        margin: 0;
        font-size: 14px;
        font-weight: 600;
      }

      .modules-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .module-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px;
        background: #fafafa;
        border: 1px solid #f0f0f0;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.3s;
      }

      .module-item:hover {
        background: #f0f0f0;
        border-color: #d9d9d9;
      }

      .module-item.selected {
        background: #e6f7ff;
        border-color: #1890ff;
      }

      .module-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .module-title {
        font-weight: 500;
      }

      .module-type-badge {
        font-size: 11px;
        padding: 2px 6px;
        background: #f0f0f0;
        border-radius: 2px;
        color: #666;
      }

      .module-actions {
        display: flex;
        gap: 4px;
      }

      .subject-actions {
        display: flex;
        gap: 4px;
      }

      .no-modules {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 32px;
        color: #999;
      }

      .no-modules span {
        font-size: 32px;
        margin-bottom: 8px;
        opacity: 0.5;
      }

      .no-modules p {
        margin: 0;
      }
    `,
  ],
})
export class SubjectCardComponent {
  @Input() subject!: Subject;
  @Input() canEdit = false;
  @Input() active = false;
  @Input() selectedModuleId: string | null = null;

  @Output() onEditSubject = new EventEmitter<Subject>();
  @Output() onDeleteSubject = new EventEmitter<Subject>();
  @Output() onUnlinkSubject = new EventEmitter<Subject>();
  @Output() onAddModule = new EventEmitter<Subject>();
  @Output() onEditModule = new EventEmitter<{ module: Module; subject: Subject }>();
  @Output() onDeleteModule = new EventEmitter<{ module: Module; subject: Subject }>();
  @Output() onSelectModule = new EventEmitter<Module>();
}

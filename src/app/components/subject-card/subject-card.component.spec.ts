import { SubjectCardComponent, Subject, Module } from './subject-card.component';

describe('SubjectCardComponent', () => {
  let component: SubjectCardComponent;

  const moduleItem: Module = {
    id: 'm1',
    title: 'Module 1',
    content: 'content',
    moduleType: 'MD',
  };

  const subject: Subject = {
    id: 1,
    name: 'Subject 1',
    description: 'Description',
    professions: [],
    module: [moduleItem],
  };

  beforeEach(() => {
    component = new SubjectCardComponent();
    component.subject = subject;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default input values', () => {
    expect(component.canEdit).toBeFalse();
    expect(component.active).toBeFalse();
    expect(component.selectedModuleId).toBeNull();
  });

  it('should emit select module event', () => {
    spyOn(component.onSelectModule, 'emit');

    component.onSelectModule.emit(moduleItem);

    expect(component.onSelectModule.emit).toHaveBeenCalledWith(moduleItem);
  });

  it('should emit edit subject event', () => {
    spyOn(component.onEditSubject, 'emit');

    component.onEditSubject.emit(subject);

    expect(component.onEditSubject.emit).toHaveBeenCalledWith(subject);
  });

  it('should emit delete module event payload', () => {
    spyOn(component.onDeleteModule, 'emit');

    const payload = { module: moduleItem, subject };
    component.onDeleteModule.emit(payload);

    expect(component.onDeleteModule.emit).toHaveBeenCalledWith(payload);
  });
});

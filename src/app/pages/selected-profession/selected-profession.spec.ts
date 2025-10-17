import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectedProfession } from './selected-profession';

describe('SelectedProfession', () => {
  let component: SelectedProfession;
  let fixture: ComponentFixture<SelectedProfession>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectedProfession]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectedProfession);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

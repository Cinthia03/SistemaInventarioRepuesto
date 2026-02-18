import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Acerovarilla } from './acerovarilla';

describe('Acerovarilla', () => {
  let component: Acerovarilla;
  let fixture: ComponentFixture<Acerovarilla>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Acerovarilla]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Acerovarilla);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

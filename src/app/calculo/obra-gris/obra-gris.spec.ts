import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObraGris } from './obra-gris';

describe('ObraGris', () => {
  let component: ObraGris;
  let fixture: ComponentFixture<ObraGris>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObraGris]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObraGris);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

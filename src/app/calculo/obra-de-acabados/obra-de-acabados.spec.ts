import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ObraDeAcabados } from './obra-de-acabados';

describe('ObraDeAcabados', () => {
  let component: ObraDeAcabados;
  let fixture: ComponentFixture<ObraDeAcabados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ObraDeAcabados]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ObraDeAcabados);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

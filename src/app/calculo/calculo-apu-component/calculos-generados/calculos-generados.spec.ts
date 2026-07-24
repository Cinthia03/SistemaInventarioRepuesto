import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalculosGenerados } from './calculos-generados';

describe('CalculosGenerados', () => {
  let component: CalculosGenerados;
  let fixture: ComponentFixture<CalculosGenerados>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculosGenerados]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalculosGenerados);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SistemaHidraulicoSanitario } from './sistema-hidraulico-sanitario';

describe('SistemaHidraulicoSanitario', () => {
  let component: SistemaHidraulicoSanitario;
  let fixture: ComponentFixture<SistemaHidraulicoSanitario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SistemaHidraulicoSanitario]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SistemaHidraulicoSanitario);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

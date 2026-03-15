import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SistemaInstalacionesElectricas } from './sistema-instalaciones-electricas';

describe('SistemaInstalacionesElectricas', () => {
  let component: SistemaInstalacionesElectricas;
  let fixture: ComponentFixture<SistemaInstalacionesElectricas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SistemaInstalacionesElectricas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SistemaInstalacionesElectricas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

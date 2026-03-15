import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Calculo } from './calculo';

describe('Calculo', () => {
  let component: Calculo;
  let fixture: ComponentFixture<Calculo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Calculo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Calculo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

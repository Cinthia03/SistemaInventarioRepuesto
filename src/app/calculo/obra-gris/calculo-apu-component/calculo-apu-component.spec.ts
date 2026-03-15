import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CalculoApuComponent } from './calculo-apu-component';

describe('CalculoApuComponent', () => {
  let component: CalculoApuComponent;
  let fixture: ComponentFixture<CalculoApuComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalculoApuComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CalculoApuComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

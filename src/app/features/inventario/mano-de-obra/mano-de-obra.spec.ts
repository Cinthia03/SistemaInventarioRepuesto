import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManoDeObra } from './mano-de-obra';

describe('ManoDeObra', () => {
  let component: ManoDeObra;
  let fixture: ComponentFixture<ManoDeObra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManoDeObra]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManoDeObra);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ApiService } from '../services/api.service';

import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-formulario',
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    CardModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    ToastModule,
  ],
  templateUrl: './formulario.html',
  styleUrls: ['./formulario.css']
})
export class FormularioComponent implements OnInit {

  formulario!: FormGroup;
  rutInvalido = false;
  sedesOpciones: { label: string; value: string }[] = [
    { label: 'Viña del Mar', value: 'Viña del Mar' },
    { label: 'Olmué', value: 'Olmué' }
  ];

  horariosPorSede: { [sede: string]: { label: string; value: string }[] } = {
    'Viña del Mar': [
      { label: 'Martes 17:00 hrs', value: 'Martes 17:00 hrs' },
      { label: 'Sábado 10:00 hrs', value: 'Sábado 10:00 hrs' }
    ],
    'Olmué': [
      { label: 'Miércoles y Viernes 17:00 hrs', value: 'Miércoles y Viernes 17:00 hrs' }
    ]
  };

  generos = [
    { name: 'Masculino' },
    { name: 'Femenino' }
  ];

  comunas = [
    { name: 'Viña del Mar' },
    { name: 'Valparaíso' },
    { name: 'Quilpué' },
    { name: 'Villa Alemana' },
    { name: 'Concón' },
    { name: 'Quintero' }
  ];

  enviando = false;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    private messageService: MessageService,
  ) {
    this.formulario = this.fb.group({
      apoderado: this.fb.group({
        nombre:    ['', [Validators.required, Validators.maxLength(80)]],
        apellidos: ['', [Validators.required, Validators.maxLength(80)]],
        correo:    ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
        telefono:  ['', [Validators.required, Validators.pattern(/^\+?56?\s?9\s?\d{4}\s?\d{4}$/), Validators.maxLength(20)]]
      }),
      pupilo: this.fb.group({
        nombre:          ['', [Validators.required, Validators.maxLength(80)]],
        apellidoPaterno: ['', [Validators.required, Validators.maxLength(80)]],
        apellidoMaterno: ['', [Validators.required, Validators.maxLength(80)]],
        rut:             ['', [Validators.required, Validators.maxLength(15), this.validarRut.bind(this)]],
        fechaNacimiento: ['', Validators.required],
        genero:          [null, Validators.required],
        direccion:       ['', [Validators.required, Validators.maxLength(150)]],
        comuna:          [null, Validators.required],
        sede:            ['', Validators.required],
        horarioSede:     ['', Validators.required]
      })
    });

    this.formulario.get('pupilo.rut')?.valueChanges.subscribe(value => {
      this.rutInvalido = !this.validarRutFormato(value);
    });

    this.formulario.get('pupilo.sede')?.valueChanges.subscribe(() => {
      this.formulario.get('pupilo.horarioSede')?.setValue('');
    });
  }

  ngOnInit(): void {
    this.apiService.getConfig().subscribe({
      next: (c) => {
        if (c.sedes?.length) {
          this.sedesOpciones = c.sedes.map((s: string) => ({ label: s, value: s }));
        }
        if (c.horariosPorSede?.length) {
          const mapa: { [sede: string]: { label: string; value: string }[] } = {};
          c.horariosPorSede.forEach((h: { sede: string; horarios: string[] }) => {
            mapa[h.sede] = (h.horarios || []).map(texto => ({ label: texto, value: texto }));
          });
          this.horariosPorSede = mapa;
        }
      },
      error: () => {}
    });
  }

  validarRut(control: AbstractControl): ValidationErrors | null {
    const rut = control.value;
    if (!rut) return null;
    return this.validarRutFormato(rut) ? null : { rutInvalido: true };
  }

  validarRutFormato(rut: string): boolean {
    if (!rut) return false;
    rut = rut.replace(/\./g, '').replace(/-/g, '');
    if (rut.length < 8 || rut.length > 9) return false;

    const cuerpo = rut.slice(0, -1);
    const dv = rut.slice(-1).toUpperCase();

    let suma = 0;
    let multiplicador = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const resto = suma % 11;
    const dvCalculado = resto === 0 ? '0' : resto === 1 ? 'K' : (11 - resto).toString();

    return dv === dvCalculado;
  }

  get horarioOpciones(): { label: string; value: string }[] {
    const sede = this.formulario.get('pupilo.sede')?.value;
    return this.horariosPorSede[sede] || [];
  }

  campoInvalido(grupo: string, campo: string): boolean {
    const control = this.formulario.get(`${grupo}.${campo}`);
    return !!(control?.invalid && control?.touched);
  }

  enviarFormulario() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Por favor, completa todos los campos requeridos correctamente.',
        life: 4000,
      });
      return;
    }

    this.enviando = true;

    this.apiService.crearInscripcion(this.formulario.value).subscribe({
      next: () => {
        this.enviando = false;
        this.messageService.add({
          severity: 'success',
          summary: '¡Solicitud enviada!',
          detail: 'Nos contactaremos contigo pronto.',
          life: 3000,
        });
        this.formulario.reset();
        this.rutInvalido = false;
        setTimeout(() => this.router.navigate(['/inicio']), 2500);
      },
      error: () => {
        this.enviando = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Error al enviar',
          detail: 'Hubo un problema al enviar la solicitud. Por favor intenta nuevamente.',
          life: 5000,
        });
      }
    });
  }

  volverInicio(): void {
    this.router.navigate(['/inicio']);
  }

  navegarRegistro(): void {
    this.router.navigate(['/pagos/registro']);
  }

  navegarLogin(): void {
    this.router.navigate(['/login']);
  }
}

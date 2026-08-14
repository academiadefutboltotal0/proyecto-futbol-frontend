import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  ValidatorFn,
  AbstractControl,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { timeout } from 'rxjs/operators';

import { MessageService } from 'primeng/api';
import { ApiService } from '../services/api.service';

import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';

function calcularDigitoVerificadorRut(cuerpo: string): string {
  let suma = 0;
  let multiplicador = 2;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  const resto = 11 - (suma % 11);
  if (resto === 11) return '0';
  if (resto === 10) return 'K';
  return String(resto);
}

function rutValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = (control.value || '').toString();
    if (!valor) return null;
    const limpio = valor.replace(/[^0-9kK]/g, '').toUpperCase();
    const cuerpo = limpio.slice(0, -1);
    const dv = limpio.slice(-1);
    if (!/^\d{7,8}$/.test(cuerpo) || calcularDigitoVerificadorRut(cuerpo) !== dv) {
      return { rutInvalido: true };
    }
    return null;
  };
}

function whatsappValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const valor = (control.value || '').toString();
    if (!valor) return null;
    let digitos = valor.replace(/[^0-9]/g, '');
    if (digitos.startsWith('56') && digitos.length === 11) digitos = digitos.slice(2);
    if (digitos.length === 10 && digitos.startsWith('0')) digitos = digitos.slice(1);
    if (digitos.length !== 9 || digitos[0] !== '9') {
      return { whatsappInvalido: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-ficha-temporada',
  standalone: true,
  providers: [MessageService],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    CardModule,
    InputTextModule,
    SelectModule,
    ButtonModule,
    ToastModule
  ],
  templateUrl: './ficha-temporada.html',
  styleUrls: ['./ficha-temporada.css']
})
export class FichaTemporadaComponent implements OnInit {

  formulario!: FormGroup;
  enviando = false;
  categoriaSugerida = '';

  diasSemana: { dia: string; label: string }[] = [
    { dia: 'lunes', label: 'Lunes' },
    { dia: 'martes', label: 'Martes' },
    { dia: 'miercoles', label: 'Miércoles' },
    { dia: 'jueves', label: 'Jueves' },
    { dia: 'viernes', label: 'Viernes' },
    { dia: 'sabado', label: 'Sábado' },
    { dia: 'domingo', label: 'Domingo' },
  ];
  sinColegio: Record<string, boolean> = {
    lunes: false, martes: false, miercoles: false, jueves: false, viernes: false, sabado: false, domingo: false,
  };

  toggleSinColegio(dia: string) {
    if (this.sinColegio[dia]) {
      this.formulario.get(`horarioSalidaColegio.${dia}`)?.setValue('');
    }
  }

  token = '';
  estado: 'cargando' | 'valido' | 'invalido' | 'expirado' | 'usado' | 'enviado' = 'cargando';
  mensajeError = '';
  esTimeout = false;
  mensajeCarga = 'Validando link...';
  private intentos = 0;

  posiciones = [
    { name: 'Arquero' },
    { name: 'Defensa' },
    { name: 'Mediocampista' },
    { name: 'Delantero' }
  ];

  pies = [
    { name: 'Derecho' },
    { name: 'Izquierdo' },
    { name: 'Ambidiestro' }
  ];

  sedesOpciones: { label: string; value: string }[] = [
    { label: 'Viña del Mar', value: 'Viña del Mar' },
    { label: 'Olmué', value: 'Olmué' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private apiService: ApiService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    this.formulario = this.fb.group({
      nombre:          ['', Validators.required],
      apellido:        ['', Validators.required],
      cedula:          ['', [Validators.required, rutValidator()]],
      fechaNacimiento: ['', Validators.required],
      posicion:        [null],
      pieHabil:        [null],
      talla:           [''],
      nombreCamiseta:  [''],
      numerosFavoritos:[''],
      aniosJugando:    [''],
      establecimiento: [''],
      curso:           [''],
      clubAmateur:     [''],
      equipoPreferido: ['', Validators.required],
      jugadorReferente:['', Validators.required],
      actitudSocial:   [''],
      direccion:       ['', Validators.required],
      ciudad:          ['', Validators.required],
      sede:            ['', Validators.required],

      horarioSalidaColegio: this.fb.group({
        lunes:     [''],
        martes:    [''],
        miercoles: [''],
        jueves:    [''],
        viernes:   [''],
        sabado:    [''],
        domingo:   [''],
      }),

      apoderado: this.fb.group({
        nombre:  ['', Validators.required],
        correo:  ['', [Validators.required, Validators.email]],
        whatsapp:['', whatsappValidator()],
        vinculo: ['']
      })
    });

    // Cargar sedes dinámicas desde la configuración del admin
    this.apiService.getConfig().subscribe({
      next: (c) => {
        if (c.sedes?.length) {
          this.sedesOpciones = c.sedes.map((s: string) => ({ label: s, value: s }));
        }
      },
      error: () => {}
    });

    if (!this.token) {
      this.estado = 'invalido';
      this.mensajeError = 'Link inválido.';
      return;
    }

    this.validarToken();
    this.registrarObservadoresCategoria();
  }

  private registrarObservadoresCategoria(): void {
    this.formulario.get('fechaNacimiento')?.valueChanges.subscribe(() => this.actualizarCategoriaSugerida());
  }

  private actualizarCategoriaSugerida(): void {
    const fechaNacimiento = this.formulario.get('fechaNacimiento')?.value;
    const edad = this.calcularEdad(fechaNacimiento);
    this.categoriaSugerida = edad >= 0 ? this.obtenerCategoriaPorEdad(edad) : '';
  }

  private calcularEdad(fecha: string | null): number {
    if (!fecha) return -1;
    const nacimiento = new Date(fecha);
    if (isNaN(nacimiento.getTime())) return -1;
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad;
  }

  private obtenerCategoriaPorEdad(edad: number): string {
    if (edad <= 6) return 'Sub-6';
    if (edad <= 8) return 'Sub-8';
    if (edad <= 10) return 'Sub-10';
    if (edad <= 12) return 'Sub-12';
    if (edad <= 14) return 'Sub-14';
    if (edad <= 16) return 'Sub-16';
    if (edad <= 18) return 'Sub-18';
    return 'Libre';
  }

  reintentar() {
    this.estado = 'cargando';
    this.mensajeError = '';
    this.esTimeout = false;
    this.intentos = 0;
    this.mensajeCarga = 'Validando link...';
    this.validarToken();
  }

  private validarToken() {
    this.intentos++;
    this.apiService.validarInvitacion(this.token).pipe(timeout(40000)).subscribe({
      next: () => { this.estado = 'valido'; },
      error: (err) => {
        if (err?.name === 'TimeoutError') {
          if (this.intentos < 2) {
            this.mensajeCarga = 'El servidor está iniciando, reintentando...';
            setTimeout(() => this.validarToken(), 3000);
            return;
          }
          this.estado = 'invalido';
          this.esTimeout = true;
          this.mensajeError = 'El servidor tardó en responder. Intenta nuevamente.';
          return;
        }
        this.esTimeout = false;
        const msg: string = err?.error?.mensaje ?? '';
        if (msg.includes('utilizado')) { this.estado = 'usado'; }
        else if (msg.includes('expirado')) { this.estado = 'expirado'; }
        else { this.estado = 'invalido'; }
        this.mensajeError = msg || 'Link no válido.';
      }
    });
  }

  campoInvalido(campo: string): boolean {
    const control = this.formulario.get(campo);
    return !!(control?.invalid && control?.touched);
  }

  campoApoderadoInvalido(campo: string): boolean {
    const control = this.formulario.get(`apoderado.${campo}`);
    return !!(control?.invalid && control?.touched);
  }

  enviarFormulario() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario incompleto',
        detail: 'Completa los campos obligatorios.',
        life: 4000
      });
      return;
    }

    this.enviando = true;

    const payload = {
      ...this.formulario.value,
      posicion: this.formulario.value.posicion?.name || '',
      pieHabil: this.formulario.value.pieHabil?.name || '',
      invitacionToken: this.token
    };

    this.apiService.crearFichaTemporada(payload).subscribe({
      next: () => {
        this.enviando = false;
        this.estado = 'enviado';
      },
      error: (err) => {
        this.enviando = false;
        const msg: string = err?.error?.mensaje ?? '';
        if (msg.includes('utilizado') || msg.includes('expirado')) {
          this.estado = 'usado';
          this.mensajeError = msg;
        } else if (err?.status === 409) {
          this.messageService.add({
            severity: 'error',
            summary: 'RUT duplicado',
            detail: msg || 'Este jugador ya está registrado.',
            life: 5000
          });
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo guardar la ficha. Intenta nuevamente.',
            life: 4000
          });
        }
      }
    });
  }

  volverInicio() {
    this.router.navigate(['/inicio']);
  }
}

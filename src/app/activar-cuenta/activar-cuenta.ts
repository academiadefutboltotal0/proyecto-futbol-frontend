import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api.service';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-activar-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, InputTextModule],
  templateUrl: './activar-cuenta.html',
  styleUrls: ['./activar-cuenta.css'],
})
export class ActivarCuentaComponent implements OnInit {
  token = '';
  estado: 'cargando' | 'valido' | 'invalido' | 'expirado' | 'activada' = 'cargando';
  mensajeError = '';
  email = '';
  nombre = '';

  password = '';
  passwordConfirmar = '';
  enviando = false;
  errorForm = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';
    this.api.validarActivacionCuenta(this.token).subscribe({
      next: (res) => {
        this.email = res.email;
        this.nombre = res.nombre;
        this.estado = 'valido';
      },
      error: (err) => {
        if (err?.status === 410) {
          this.estado = 'expirado';
        } else {
          this.estado = 'invalido';
          this.mensajeError = err?.error?.mensaje || 'Este link no existe o no es válido.';
        }
      },
    });
  }

  activar() {
    this.errorForm = '';
    if (this.password.length < 8) {
      this.errorForm = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (this.password !== this.passwordConfirmar) {
      this.errorForm = 'Las contraseñas no coinciden.';
      return;
    }
    this.enviando = true;
    this.api.activarCuenta(this.token, this.password).subscribe({
      next: () => {
        this.enviando = false;
        this.estado = 'activada';
      },
      error: (err) => {
        this.enviando = false;
        this.errorForm = err?.error?.mensaje || 'No se pudo activar la cuenta. Intenta nuevamente.';
      },
    });
  }

  irALogin() {
    this.router.navigate(['/login']);
  }
}

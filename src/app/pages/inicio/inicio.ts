import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AfterViewInit, ChangeDetectorRef, Component, HostBinding, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { DialogModule } from 'primeng/dialog';
import { GalleriaModule } from 'primeng/galleria';

@Component({
  selector: 'app-inicio',
  imports: [CommonModule, DialogModule, ButtonModule, CarouselModule, GalleriaModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio implements OnInit, AfterViewInit, OnDestroy {
  @HostBinding('class.dark') temaOscuro = false;
  menuAbierto = false;

  mostrarPostulaciones = false;
  mostrarImagenPopup = false;
  mostrarDetalleNoticia = false;
  noticiaSeleccionada: Noticia | null = null;
  seccionActiva = 'noticias';

  private observer?: IntersectionObserver;

  configCargada = false;
  noticiasCargadas = false;

  siteConfig = {
    tituloHeader: '',
    tituloBienvenida: '',
    subtituloBienvenida: '',
    imagenDestacada: '',
    imagenesCarrusel: [] as string[],
    imagenesGaleria: [] as GaleriaImg[],
    mostrarPopup: true,
    imagenPopup: '',
    tituloPopup: '',
    cuerpoPopup: '',
  };

  get imgDestacada(): string {
    return this.siteConfig.imagenDestacada || 'media/KevinVasquez.png';
  }

  get galeriaNumVisible(): number {
    return Math.max(1, Math.min(this.siteConfig.imagenesGaleria.length, 5));
  }

  galeriaActiveIndex = 0;

  private readonly apiUrl = environment.apiUrl;

  noticias: Noticia[] = [];

  partidos: Partido[] = [];

  constructor(private router: Router, private http: HttpClient, private cdr: ChangeDetectorRef, private zone: NgZone) {}

  ngOnInit(): void {
    this.temaOscuro = localStorage.getItem('inicio-tema') === 'oscuro';

    this.http.get<any>(`${this.apiUrl}/config`).subscribe({
      next: (config) => {
        this.zone.run(() => {
          if (config.tituloHeader) this.siteConfig.tituloHeader = config.tituloHeader;
          if (config.tituloBienvenida) this.siteConfig.tituloBienvenida = config.tituloBienvenida;
          if (config.subtituloBienvenida)
            this.siteConfig.subtituloBienvenida = config.subtituloBienvenida;
          if (config.imagenDestacada) this.siteConfig.imagenDestacada = config.imagenDestacada;
          if (Array.isArray(config.imagenesCarrusel) && config.imagenesCarrusel.length > 0)
            this.siteConfig.imagenesCarrusel = config.imagenesCarrusel;
          if (Array.isArray(config.imagenesGaleria) && config.imagenesGaleria.length > 0)
            this.siteConfig.imagenesGaleria = config.imagenesGaleria;
          this.siteConfig.mostrarPopup = config.mostrarPopup ?? true;
          if (config.imagenPopup) this.siteConfig.imagenPopup = config.imagenPopup;
          if (config.tituloPopup) this.siteConfig.tituloPopup = config.tituloPopup;
          if (config.cuerpoPopup) this.siteConfig.cuerpoPopup = config.cuerpoPopup;
          if (this.siteConfig.mostrarPopup) this.mostrarPostulaciones = true;
          this.configCargada = true;
          this.cdr.detectChanges();
        });
      },
      error: () => {},
    });

    this.http.get<Noticia[]>(`${this.apiUrl}/noticias`).subscribe({
      next: (data) => {
        this.zone.run(() => {
          if (data && data.length > 0) this.noticias = data;
          this.noticiasCargadas = true;
          this.cdr.detectChanges();
        });
      },
      error: () => { this.noticiasCargadas = true; },
    });

    this.http.get<Partido[]>(`${this.apiUrl}/partidos`).subscribe({
      next: (data) => {
        this.zone.run(() => {
          if (data && data.length > 0) this.partidos = data;
          this.cdr.detectChanges();
        });
      },
      error: () => {},
    });

  }

  ngAfterViewInit(): void {
    const sectionIds = ['noticias', 'partidos', 'galerias'];

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.seccionActiva = entry.target.id;
            break;
          }
        }
      },
      { rootMargin: '-55% 0px -35% 0px' }
    );

    for (const id of sectionIds) {
      const el = document.getElementById(id);
      if (el) this.observer.observe(el);
    }
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  toggleTema(): void {
    this.temaOscuro = !this.temaOscuro;
    localStorage.setItem('inicio-tema', this.temaOscuro ? 'oscuro' : 'claro');
  }

  scrollTo(section: string): void {
    document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  verNoticia(noticia: Noticia): void {
    this.noticiaSeleccionada = noticia;
    this.mostrarDetalleNoticia = true;
  }

  abrirPopup(): void {
    this.mostrarPostulaciones = true;
  }

  abrirImagenPopup(): void {
    this.mostrarImagenPopup = true;
  }

  cerrarPopup(): void {
    this.mostrarPostulaciones = false;
  }

  cerrarImagenPopup(): void {
    this.mostrarImagenPopup = false;
  }

  navegarFormulario(): void {
    this.router.navigate(['/formulario']);
    this.cerrarPopup();
  }

  navegarLogin(): void {
    this.router.navigate(['/login']);
  }

  navegarRegistro(): void {
    this.router.navigate(['/pagos/registro']);
  }
}

export interface Noticia {
  _id?: string;
  titulo: string;
  descripcion: string;
  contenido?: string;
  fecha: string;
  imagenUrl: string;
  categoria: 'Entrenamiento' | 'Partido' | 'Evento';
}

export interface Partido {
  _id?: string;
  local: string;
  visitante: string;
  fecha: string;
  hora?: string;
  resultado?: string;
  sede?: string;
  tipo: 'proximo' | 'resultado';
}

export interface GaleriaImg {
  url: string;
  descripcion?: string;
}
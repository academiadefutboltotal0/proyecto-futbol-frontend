import { Component, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { RendimientoService } from '../../services/rendimiento.service';
import { ChartModule } from 'primeng/chart';

interface RegistroAsistencia {
  jugadorId: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  categoria: string;
  estado: 'asistio' | 'ausente' | 'justificado' | 'licenciado';
  marcado: boolean;
}

@Component({
  selector: 'app-vista-profesor',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartModule],
  templateUrl: './vista-profesor.html',
  styleUrl: './vista-profesor.css'
})
export class VistaProfesorComponent implements OnInit {
  // Type annotations for strict mode compliance
  @HostBinding('class.dark') temaOscuro = false;
  menuAbierto = false;

  profesor: any = null;
  usuario: any = null;
  fichas: any[] = [];
  cargando = true;
  error = '';
  tituloHeader = 'Escuela de Fútbol';

  tabActiva: 'jugadores' | 'asistencia' | 'rendimiento' = 'asistencia';
  divisionFiltro: string | null = null;

  // Asistencia
  fechaSeleccionada = '';
  registros: RegistroAsistencia[] = [];
  modoAsistencia: 'registrar' | 'libro' = 'registrar';

  // Libro del mes (profesor)
  libroMes       = (() => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`; })();
  libroFechas   : string[] = [];
  libroJugadores: any[]   = [];
  cargandoLibro  = false;
  libroError     = '';
  libroFiltroDivision: string | null = null;

  // Rendimiento (batch por fecha — conservado)
  fechaRendimiento = '';
  registrosRendimiento: any[] = [];
  guardandoRendimiento = false;
  rendimientoGuardado = false;
  errorRendimiento = '';
  cargandoAsistencia = false;
  guardando = false;
  asistenciaGuardada = false;
  errorAsistencia = '';

  // Rendimiento individual
  jugadorSeleccionadoRend: any = null;
  rendForm = this.rendFormVacio();
  rendHistorial: any[] = [];
  rendResumen: any = {};
  guardandoRendInd = false;
  rendIndGuardado = false;
  errorRendInd = '';
  cargandoRendHist = false;
  rendChartData: any = null;
  rendChartOptions: any = null;
  rendZoomAnio: number | null = null;
  rendZoomMes: number | null = null;

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private rendimientoService: RendimientoService
  ) {}

  ngOnInit() {
    this.usuario = this.auth.getUsuario();
    this.temaOscuro = localStorage.getItem('tema') === 'dark';
    this.cargarDatos();
    this.api.getConfig().subscribe({
      next: (c: any) => { if (c?.tituloHeader) this.tituloHeader = c.tituloHeader; },
      error: () => {}
    });
  }

  cargarDatos() {
    this.api.getPerfilProfesor().subscribe({
      next: (p: any) => {
        this.profesor = p;
        this.api.getMisFichas().subscribe({
          next: (f: any) => {
            this.fichas = f;
            this.cargando = false;
            this.seleccionarHoySiEsDiaDeEntrenamiento();
          },
          error: () => { this.error = 'Error al cargar jugadores.'; this.cargando = false; }
        });
      },
      error: () => { this.error = 'Error al cargar perfil del profesor.'; this.cargando = false; }
    });
  }

  /* Si hoy es uno de los días de entrenamiento de la semana, lo deja preseleccionado
     para que el profesor pueda pasar lista de inmediato al entrar, sin clics extra. */
  private seleccionarHoySiEsDiaDeEntrenamiento() {
    const hoy = new Date();
    const toISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dia}`;
    };
    const hoyISO = toISO(hoy);
    const esDiaDeEntrenamiento = this.diasEntrenamiento.some(d => d.fechaISO === hoyISO);
    if (esDiaDeEntrenamiento) {
      this.seleccionarDia(hoyISO);
    }
  }

  get diasEntrenamiento(): { dia: number; diaNombre: string; fechaISO: string; fecha: Date }[] {
    const hoy = new Date();
    const dow = hoy.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
    const diasDesdeElLunes = dow === 0 ? 6 : dow - 1;
    const lunes = new Date(hoy);
    lunes.setHours(0, 0, 0, 0);
    lunes.setDate(hoy.getDate() - diasDesdeElLunes);

    const toISO = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dia}`;
    };

    const miercoles = new Date(lunes); miercoles.setDate(lunes.getDate() + 2);
    const viernes   = new Date(lunes); viernes.setDate(lunes.getDate() + 4);

    return [
      { dia: miercoles.getDate(), diaNombre: 'Miércoles', fechaISO: toISO(miercoles), fecha: miercoles },
      { dia: viernes.getDate(),   diaNombre: 'Viernes',   fechaISO: toISO(viernes),   fecha: viernes   },
    ];
  }

  get semanaLabel(): string {
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const [mie, vie] = this.diasEntrenamiento;
    return `Miércoles ${mie.dia} y Viernes ${vie.dia} de ${meses[mie.fecha.getMonth()]} ${mie.fecha.getFullYear()}`;
  }

  seleccionarDia(fechaISO: string) {
    if (this.cargandoAsistencia) return;
    this.fechaSeleccionada = fechaISO;
    this.cargarAsistenciaFecha();
  }

  cargarAsistenciaFecha() {
    if (!this.fechaSeleccionada) return;
    this.cargandoAsistencia = true;
    this.asistenciaGuardada = false;
    this.errorAsistencia = '';

    this.registros = this.fichasFiltradas.map(f => ({
      jugadorId: f._id,
      nombre: f.nombre,
      apellidoPaterno: f.apellidoPaterno || '',
      apellidoMaterno: f.apellidoMaterno || '',
      categoria: f.categoria,
      estado: 'asistio' as const,
      marcado: false
    }));

    this.api.getAsistenciasProfesor(this.fechaSeleccionada).subscribe({
      next: (asistencias: any[]) => {
        asistencias.forEach((a: any) => {
          const r = this.registros.find(r => r.jugadorId.toString() === a.jugadorId.toString());
          if (r) { r.estado = a.estado; r.marcado = true; }
        });
        // Si ya hay registros guardados para esta fecha, bloquear re-guardado
        if (asistencias.length > 0) {
          this.asistenciaGuardada = true;
          this.registros.forEach(r => {
            if (!r.marcado) { r.marcado = true; r.estado = 'ausente'; }
          });
        }
        this.cargandoAsistencia = false;
      },
      error: () => { this.cargandoAsistencia = false; }
    });
  }

  setEstado(registro: RegistroAsistencia, estado: 'asistio' | 'ausente' | 'justificado' | 'licenciado') {
    if (this.asistenciaGuardada) return;
    registro.estado = estado;
    registro.marcado = true;
  }

  getLetra(registro: RegistroAsistencia): string {
    if (!registro.marcado) return '';
    if (registro.estado === 'ausente')     return 'A';
    if (registro.estado === 'justificado') return 'J';
    if (registro.estado === 'licenciado')  return 'L';
    return 'P';
  }

  /* Tap/clic → cicla P → L → J → A → P (para móvil, donde no aparece teclado en un input readonly) */
  onLetraClick(registro: RegistroAsistencia, index: number) {
    if (this.asistenciaGuardada) return;
    const ciclo: Record<string, RegistroAsistencia['estado']> = {
      '': 'asistio',
      asistio: 'licenciado',
      licenciado: 'justificado',
      justificado: 'ausente',
      ausente: 'asistio',
    };
    const actual = registro.marcado ? registro.estado : '';
    this.setEstado(registro, ciclo[actual] ?? 'asistio');
    this.moverFoco(index + 1);
  }

  onLetraKeydown(event: KeyboardEvent, registro: RegistroAsistencia, index: number) {
    if (this.asistenciaGuardada) {
      event.preventDefault();
      return;
    }
    const key = event.key.toUpperCase();
    if      (key === 'P') { event.preventDefault(); registro.marcado = true; this.setEstado(registro, 'asistio');     this.moverFoco(index + 1); }
    else if (key === 'A') { event.preventDefault(); registro.marcado = true; this.setEstado(registro, 'ausente');      this.moverFoco(index + 1); }
    else if (key === 'J') { event.preventDefault(); registro.marcado = true; this.setEstado(registro, 'justificado'); this.moverFoco(index + 1); }
    else if (key === 'L') { event.preventDefault(); registro.marcado = true; this.setEstado(registro, 'licenciado');  this.moverFoco(index + 1); }
    else if (key === 'ENTER' || key === 'ARROWDOWN') { event.preventDefault(); this.moverFoco(index + 1); }
    else if (key === 'ARROWUP') { event.preventDefault(); this.moverFoco(index - 1); }
  }

  moverFoco(index: number) {
    const el = document.getElementById(`asis-${index}`);
    if (el) el.focus();
  }

  guardarAsistencia() {
    if (!this.fechaSeleccionada || this.registros.length === 0) return;
    if (this.asistenciaGuardada) return;
    this.guardando = true;
    this.errorAsistencia = '';

    // Los no marcados quedan como 'ausente'
    const payload = this.registros.map(r => ({
      jugadorId: r.jugadorId,
      estado: r.marcado ? r.estado : 'ausente'
    }));

    this.api.guardarAsistenciasLote(this.fechaSeleccionada, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.asistenciaGuardada = true;
        // Marcar todos como guardados para bloquear re-edición
        this.registros.forEach(r => { r.marcado = true; });
        this.cargarLibroProfesor();
      },
      error: () => { this.guardando = false; this.errorAsistencia = 'Error al guardar. Intente nuevamente.'; }
    });
  }

  cargarLibroProfesor() {
    this.cargandoLibro = true;
    this.libroError = '';
    this.api.getLibroProfesor(this.libroMes).subscribe({
      next: (data: any) => {
        this.libroFechas = data.fechas;
        this.libroJugadores = (data.jugadores || []).filter((j: any) => this.applyProfesorSedeLibroFilter(j));
        this.cargandoLibro = false;
      },
      error: (err: any) => { this.cargandoLibro = false; this.libroError = err?.error?.mensaje || 'Error al cargar el libro.'; }
    });
  }

  abrirLibro() {
    this.modoAsistencia = 'libro';
    this.cargarLibroProfesor();
  }

  estadoLetraProf(estado: string): string {
    if (estado === 'asistio')     return 'P';
    if (estado === 'ausente')     return 'A';
    if (estado === 'justificado') return 'J';
    if (estado === 'licenciado')  return 'L';
    return '—';
  }

  formatFechaLibroProf(iso: string): string {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  }

  nombreLibroProf(j: any): string {
    const ap = j.apellido || `${j.apellidoPaterno} ${j.apellidoMaterno}`.trim();
    return ap ? `${ap}, ${j.nombre}` : j.nombre;
  }

  toggleTema() {
    this.temaOscuro = !this.temaOscuro;
    localStorage.setItem('tema', this.temaOscuro ? 'dark' : 'light');
  }

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  calcularEdad(fechaNac: string): number {
    if (!fechaNac) return 0;
    const hoy = new Date();
    const nac = new Date(fechaNac);
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  }

  cargarRendimientoFecha() {
    if (!this.fechaRendimiento) return;
    this.rendimientoGuardado = false;
    this.errorRendimiento = '';
    this.registrosRendimiento = this.fichas.map(f => ({
      jugadorId: f._id,
      nombre: f.nombre,
      categoria: f.categoria,
      fisico: 3, tecnico: 3, psicologico: 3, estrategico: 3, notas: ''
    }));
    this.api.getRendimientoProfesorFecha(this.fechaRendimiento).subscribe({
      next: (datos: any[]) => {
        datos.forEach((d: any) => {
          const r = this.registrosRendimiento.find(r => r.jugadorId.toString() === d.jugadorId.toString());
          if (r) { r.fisico = d.fisico; r.tecnico = d.tecnico; r.psicologico = d.psicologico; r.estrategico = d.estrategico; r.notas = d.notas || ''; }
        });
      }
    });
  }

  guardarRendimiento() {
    if (!this.fechaRendimiento || !this.registrosRendimiento.length) return;
    this.guardandoRendimiento = true;
    this.errorRendimiento = '';
    this.api.guardarRendimientoProfesor(this.fechaRendimiento, this.registrosRendimiento).subscribe({
      next: () => { this.guardandoRendimiento = false; this.rendimientoGuardado = true; },
      error: () => { this.guardandoRendimiento = false; this.errorRendimiento = 'Error al guardar. Intente nuevamente.'; }
    });
  }

  rendFormVacio() {
    return {
      fisico:      { velocidad: 50, agilidad: 50, resistencia: 50, fuerza: 50, coordinacion: 50 },
      tecnico:     { controlDominio: 50, precisionEjecucion: 50, fluidezMovimiento: 50, usoPerfiles: 50, posturaCorporal: 50 },
      actitudinal: { motivacion: 50, reaccionResultado: 50, apoyoCompanero: 50, deseosSuperacion: 50, resiliencia: 50 },
      estrategico: { tomaDecisiones: 50, lecturaJuego: 50, ocupacionEspacio: 50, transiciones: 50, cumplimientoPlan: 50 },
      actitudAdversidad: '',
      comentario: ''
    };
  }

  promedioCat(cat: any): number {
    const vals = Object.values(cat).map(v => Number(v)).filter(v => !isNaN(v));
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  }

  seleccionarJugadorRend(f: any) {
    this.jugadorSeleccionadoRend = f;
    this.rendForm = this.rendFormVacio();
    this.rendIndGuardado = false;
    this.errorRendInd = '';
    this.cargarHistorialRend();
  }

  cargarHistorialRend() {
    if (!this.jugadorSeleccionadoRend) return;
    this.cargandoRendHist = true;
    this.rendChartData = null;
    this.rendZoomAnio = null;
    this.rendZoomMes = null;
    this.rendimientoService.obtenerRendimientos(this.jugadorSeleccionadoRend._id).subscribe({
      next: (data: any[]) => {
        this.rendHistorial = [...data].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        this.cargandoRendHist = false;
        this.buildRendChart();
      },
      error: () => { this.cargandoRendHist = false; }
    });
    this.rendimientoService.obtenerResumen(this.jugadorSeleccionadoRend._id).subscribe({
      next: (data: any) => { this.rendResumen = data; }
    });
    this.rendHistEditandoId = null;
    this.rendHistEditForm = null;
  }

  /* Edición de una sesión ya guardada, desde el historial del profesor */
  rendHistEditandoId: string | null = null;
  rendHistEditForm: any = null;
  guardandoRendHistEdit = false;

  editarRendimientoHistorial(r: any) {
    this.rendHistEditandoId = r._id;
    this.rendHistEditForm = {
      fisico: { ...r.fisico },
      tecnico: { ...r.tecnico },
      actitudinal: { ...r.actitudinal },
      estrategico: { ...r.estrategico },
      comentario: r.comentario || '',
    };
  }

  cancelarEdicionRendimientoHistorial() {
    this.rendHistEditandoId = null;
    this.rendHistEditForm = null;
  }

  guardarEdicionRendimientoHistorial() {
    if (!this.rendHistEditandoId || !this.rendHistEditForm) return;
    this.guardandoRendHistEdit = true;
    this.rendimientoService.editarRendimiento(this.rendHistEditandoId, this.rendHistEditForm).subscribe({
      next: (actualizado: any) => {
        const idx = this.rendHistorial.findIndex((r: any) => r._id === this.rendHistEditandoId);
        if (idx >= 0) this.rendHistorial[idx] = actualizado;
        this.guardandoRendHistEdit = false;
        this.cancelarEdicionRendimientoHistorial();
        this.buildRendChart();
      },
      error: () => { this.guardandoRendHistEdit = false; }
    });
  }

  buildRendChart() {
    const data = this.rendHistorialFiltrado;
    if (!data.length) { this.rendChartData = null; return; }
    const isDark = this.temaOscuro;
    const textColor = isDark ? 'rgba(244,247,243,.7)' : 'rgba(20,50,20,.6)';
    const gridColor = isDark ? 'rgba(57,211,83,.1)' : 'rgba(30,122,48,.1)';
    const labels = data.map((r: any) => {
      const d = new Date(r.fecha);
      return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`;
    });
    this.rendChartData = {
      labels,
      datasets: [
        { label: 'Físico',      data: data.map((r: any) => r.fisico?.promedio      ?? 0), borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.1)', tension: 0.4, fill: false, pointRadius: 4 },
        { label: 'Técnico',     data: data.map((r: any) => r.tecnico?.promedio     ?? 0), borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,.1)', tension: 0.4, fill: false, pointRadius: 4 },
        { label: 'Actitudinal', data: data.map((r: any) => r.actitudinal?.promedio ?? 0), borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,.1)',  tension: 0.4, fill: false, pointRadius: 4 },
        { label: 'Estratégico', data: data.map((r: any) => r.estrategico?.promedio ?? 0), borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,.1)',  tension: 0.4, fill: false, pointRadius: 4 },
      ]
    };
    this.rendChartOptions = {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: textColor, font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } }
      },
      scales: {
        y: { min: 0, max: 100, ticks: { color: textColor, callback: (v: any) => `${v}%` }, grid: { color: gridColor } },
        x: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    };
  }

  get rendHistorialFiltrado(): any[] {
    let data = this.rendHistorial;
    if (this.rendZoomAnio !== null) data = data.filter((r: any) => new Date(r.fecha).getFullYear() === this.rendZoomAnio);
    if (this.rendZoomMes  !== null) data = data.filter((r: any) => new Date(r.fecha).getMonth()    === this.rendZoomMes);
    return data;
  }

  get rendAniosDisponibles(): number[] {
    return [...new Set(this.rendHistorial.map((r: any) => new Date(r.fecha).getFullYear()))].sort() as number[];
  }

  get rendMesesDisponibles(): { label: string; value: number }[] {
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const base = this.rendZoomAnio !== null
      ? this.rendHistorial.filter((r: any) => new Date(r.fecha).getFullYear() === this.rendZoomAnio)
      : this.rendHistorial;
    const nums = [...new Set(base.map((r: any) => new Date(r.fecha).getMonth()))].sort((a: any, b: any) => a - b) as number[];
    return nums.map(m => ({ label: meses[m], value: m }));
  }

  setRendZoomAnio(anio: number | null) { this.rendZoomAnio = anio; this.rendZoomMes = null; this.buildRendChart(); }
  setRendZoomMes(mes: number | null)   { this.rendZoomMes  = mes;  this.buildRendChart(); }

  guardarRendimientoIndividual() {
    this.guardandoRendInd = true;
    this.errorRendInd = '';
    this.rendIndGuardado = false;
    const n = (v: any) => Number(v);
    const f = this.rendForm;
    const data = {
      jugadorId:  this.jugadorSeleccionadoRend._id,
      profesorId: this.profesor?._id,
      fisico:      { velocidad: n(f.fisico.velocidad), agilidad: n(f.fisico.agilidad), resistencia: n(f.fisico.resistencia), fuerza: n(f.fisico.fuerza), coordinacion: n(f.fisico.coordinacion) },
      tecnico:     { controlDominio: n(f.tecnico.controlDominio), precisionEjecucion: n(f.tecnico.precisionEjecucion), fluidezMovimiento: n(f.tecnico.fluidezMovimiento), usoPerfiles: n(f.tecnico.usoPerfiles), posturaCorporal: n(f.tecnico.posturaCorporal) },
      actitudinal: { motivacion: n(f.actitudinal.motivacion), reaccionResultado: n(f.actitudinal.reaccionResultado), apoyoCompanero: n(f.actitudinal.apoyoCompanero), deseosSuperacion: n(f.actitudinal.deseosSuperacion), resiliencia: n(f.actitudinal.resiliencia) },
      estrategico: { tomaDecisiones: n(f.estrategico.tomaDecisiones), lecturaJuego: n(f.estrategico.lecturaJuego), ocupacionEspacio: n(f.estrategico.ocupacionEspacio), transiciones: n(f.estrategico.transiciones), cumplimientoPlan: n(f.estrategico.cumplimientoPlan) },
      actitudAdversidad: f.actitudAdversidad || '',
      comentario:  f.comentario
    };
    this.rendimientoService.crearRendimiento(data).subscribe({
      next: () => {
        this.guardandoRendInd = false;
        this.rendIndGuardado = true;
        this.rendForm = this.rendFormVacio();
        this.cargarHistorialRend();
      },
      error: (err: any) => {
        this.guardandoRendInd = false;
        const msg = err?.error?.detalle || err?.error?.mensaje || err?.message || '';
        this.errorRendInd = `Error (${err?.status}): ${msg}`;
      }
    });
  }

  private normalizeString(value: string | null | undefined): string {
    if (!value) return '';
    return value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeCategoria(value: string | null | undefined): string {
    const normalized = this.normalizeString(value);
    return normalized.replace(/sub\s*[-_\s]?(\d+)/, 'sub-$1');
  }

  private normalizeSede(value: string | null | undefined): string {
    return this.normalizeString(value);
  }

  private categoriaMatches(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!b) return true;
    const aNorm = this.normalizeCategoria(a);
    const bNorm = this.normalizeCategoria(b);
    return !!aNorm && (aNorm === bNorm || aNorm.includes(bNorm) || bNorm.includes(aNorm));
  }

  private sedeMatches(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!b) return true;
    const aNorm = this.normalizeSede(a);
    const bNorm = this.normalizeSede(b);
    return !!aNorm && (aNorm === bNorm || aNorm.includes(bNorm) || bNorm.includes(aNorm));
  }

  private applyProfesorSedeFilter(fichas: any[]): any[] {
    if (!this.profesor?.sede) return fichas;
    return fichas.filter(f => this.sedeMatches(f.sede, this.profesor.sede));
  }

  private applyProfesorSedeLibroFilter(jugador: any): boolean {
    return !this.profesor?.sede || this.sedeMatches(jugador.sede, this.profesor.sede);
  }

  get fichasFiltradas(): any[] {
    if (!this.divisionFiltro) return this.fichas;
    return this.fichas.filter(f => this.categoriaMatches(f.categoria, this.divisionFiltro));
  }

  get libroJugadoresFiltrados(): any[] {
    if (!this.libroFiltroDivision) return this.libroJugadores;
    return this.libroJugadores.filter(j => this.categoriaMatches(j.categoria, this.libroFiltroDivision));
  }

  toggleFiltroDiv(d: string) {
    this.divisionFiltro = this.divisionFiltro === d ? null : d;
    if (this.fechaSeleccionada) this.cargarAsistenciaFecha();
    if (this.jugadorSeleccionadoRend && this.divisionFiltro && this.jugadorSeleccionadoRend.categoria !== this.divisionFiltro) {
      this.jugadorSeleccionadoRend = null;
      this.rendHistorial = [];
      this.rendResumen = {};
    }
  }

  get divisiones(): string {
    return this.profesor?.divisiones?.join(', ') || '—';
  }

  get totalAsistio(): number {
    return this.registros.filter(r => r.marcado && (r.estado === 'asistio' || r.estado === 'licenciado')).length;
  }

  get totalAusente(): number {
    return this.registros.filter(r => r.marcado && r.estado === 'ausente').length;
  }

  get totalJustificado(): number {
    return this.registros.filter(r => r.marcado && r.estado === 'justificado').length;
  }

  get totalLicenciado(): number {
    return this.registros.filter(r => r.marcado && r.estado === 'licenciado').length;
  }
}

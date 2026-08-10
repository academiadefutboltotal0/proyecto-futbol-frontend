import { Component, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { PagosService } from '../../services/pagos.service';
import { ChartModule } from 'primeng/chart';

@Component({
  selector: 'app-vista-cliente',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartModule],
  templateUrl: './vista-cliente.html',
  styleUrl: './vista-cliente.css'
})
export class VistaClienteComponent implements OnInit {
  @HostBinding('class.dark') temaOscuro = false;
  menuAbierto = false;

  ficha: any = null;
  fichas: any[] = [];
  cargando = true;
  error = '';
  usuario: any = null;
  tituloHeader = 'Escuela de Fútbol';

  pagosMensuales: any = null;
  pagosMensualesError = false;
  voucherMesActual: { existe: boolean; estado: string | null } = { existe: false, estado: null };
  rendimiento: any = null;

  chartData: any = null;
  chartOptions: any = null;

  mostrarFormVoucher = false;
  voucherForm = { sede: '', montoPagado: 20000, fecha: '', voucherBase64: '' };
  voucherPreview = '';
  enviandoVoucher = false;
  mensajeVoucher = '';
  tipoMensajeVoucher: 'ok' | 'error' | '' = '';

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private pagosService: PagosService
  ) {}

  ngOnInit() {
    this.usuario = this.auth.getUsuario();
    const tema = localStorage.getItem('tema');
    this.temaOscuro = tema === 'dark';
    this.cargarFicha();
    this.api.getConfig().subscribe({
      next: (c: any) => { if (c?.tituloHeader) this.tituloHeader = c.tituloHeader; },
      error: () => {}
    });
  }

  cargarPagosMensuales(fichaId: string) {
    this.api.getMisPagosMensuales(fichaId).subscribe({
      next: (data) => {
        this.pagosMensuales = {
          mesActual: { mes: data.mesActual.mes, anio: data.mesActual['año'], estado: data.mesActual.estado, monto: data.mesActual.monto },
          historial: (data.historial || []).map((p: any) => ({ mes: p.mes, anio: p['año'], estado: p.estado }))
        };
        this.voucherMesActual = data.voucherMesActual || { existe: false, estado: null };
      },
      error: () => { this.pagosMensualesError = true; this.pagosMensuales = { error: true }; }
    });
  }

  buildChart(data: any) {
    if (!data?.historial?.length) return;
    const hist = data.historial;
    const labels = hist.map((h: any) => {
      const d = new Date(h.fecha);
      return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    });
    const textColor = this.temaOscuro ? 'rgba(244,247,243,.7)' : 'rgba(20,50,20,.6)';
    const gridColor = this.temaOscuro ? 'rgba(57,211,83,.1)' : 'rgba(30,122,48,.1)';

    this.chartData = {
      labels,
      datasets: [
        { label: 'Rendimiento General', data: hist.map((h: any) => h.general ?? Math.round(((h.fisico||0)+(h.tecnico||0)+(h.actitudinal||0)+(h.estrategico||0))/4)), borderColor: '#39d353', backgroundColor: 'rgba(57,211,83,.15)', tension: 0.4, fill: true, pointRadius: 5, borderWidth: 2 },
      ]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { labels: { color: textColor, font: { size: 13 } } },
        tooltip: { callbacks: { label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y}%` } }
      },
      scales: {
        y: {
          min: 0, max: 100,
          ticks: { color: textColor, callback: (v: any) => `${v}%` },
          grid: { color: gridColor }
        },
        x: {
          ticks: { color: textColor },
          grid: { color: gridColor }
        }
      }
    };
  }

  cargarFicha() {
    this.api.getMisFichasCliente().subscribe({
      next: (data) => {
        this.fichas = data;
        if (data.length === 0) {
          this.error = 'No se encontró información asociada a tu cuenta.';
        } else {
          this.ficha = data[0];
          this.cargarRendimientoFicha(this.ficha._id);
          this.cargarPagosMensuales(this.ficha._id);
        }
        this.cargando = false;
      },
      error: () => {
        this.api.getMiFicha().subscribe({
          next: (data) => { this.ficha = data; this.fichas = [data]; this.cargarRendimientoFicha(data._id); this.cargarPagosMensuales(data._id); this.cargando = false; },
          error: () => { this.error = 'No se encontró información asociada a tu cuenta.'; this.cargando = false; }
        });
      }
    });
  }

  cambiarFicha(ficha: any) {
    this.ficha = ficha;
    this.rendimiento = null;
    this.chartData = null;
    this.cargarRendimientoFicha(ficha._id);
    this.cargarPagosMensuales(ficha._id);
  }

  cargarRendimientoFicha(fichaId: string) {
    this.api.getMiRendimiento(fichaId).subscribe({
      next: (data) => {
        this.rendimiento = data;
        this.buildChart(data);
      }
    });
  }

  abrirFormVoucher(): void {
    this.mostrarFormVoucher = !this.mostrarFormVoucher;
    if (this.mostrarFormVoucher) {
      this.voucherForm.sede = this.ficha?.sede || '';
      this.tipoMensajeVoucher = '';
      this.mensajeVoucher = '';
      // Refrescar estado de pago para mostrar el estado más reciente
      this.recargarEstadoPago();
    }
  }

  recargarEstadoPago(): void {
    this.api.getMisPagosMensuales().subscribe({
      next: (data) => {
        this.pagosMensuales = {
          mesActual: { mes: data.mesActual.mes, anio: data.mesActual['año'], estado: data.mesActual.estado, monto: data.mesActual.monto },
          historial: (data.historial || []).map((p: any) => ({ mes: p.mes, anio: p['año'], estado: p.estado }))
        };
        this.voucherMesActual = data.voucherMesActual || { existe: false, estado: null };
        // Si ya está pagado, cerrar el formulario
        if (data.mesActual.estado === 'pagado') this.mostrarFormVoucher = false;
      },
      error: () => {}
    });
  }

  quitarVoucherImagen(): void {
    this.voucherPreview = '';
    this.voucherForm.voucherBase64 = '';
  }

  onVoucherFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let w = img.width, h = img.height;
        if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', 0.75);
        this.voucherPreview = compressed;
        this.voucherForm.voucherBase64 = compressed;
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  enviarVoucher(): void {
    // Asegurar sede desde la ficha si aún no está
    if (!this.voucherForm.sede) this.voucherForm.sede = this.ficha?.sede || '';
    if (!this.ficha || !this.voucherForm.fecha || !this.voucherForm.voucherBase64) {
      this.tipoMensajeVoucher = 'error';
      this.mensajeVoucher = 'Por favor completa todos los campos y sube el comprobante.';
      return;
    }
    this.enviandoVoucher = true;
    this.mensajeVoucher = '';
    this.pagosService.postPago({
      apoderado: this.ficha.apoderado?.nombre || 'Apoderado',
      alumno: `${this.ficha.nombre} (${this.ficha.cedula || 'sin RUT'})`,
      sede: this.voucherForm.sede,
      monto: this.voucherForm.montoPagado,
      fecha: this.voucherForm.fecha,
      voucherBase64: this.voucherForm.voucherBase64,
      fichaId: this.ficha._id,
    }).subscribe({
      next: () => {
        this.enviandoVoucher = false;
        this.tipoMensajeVoucher = 'ok';
        this.mensajeVoucher = 'Voucher enviado. El administrador revisará tu pago.';
        this.mostrarFormVoucher = false;
        this.voucherForm = { sede: '', montoPagado: 20000, fecha: '', voucherBase64: '' };
        this.voucherPreview = '';
      },
      error: () => {
        this.enviandoVoucher = false;
        this.tipoMensajeVoucher = 'error';
        this.mensajeVoucher = 'No se pudo enviar el voucher. Intenta nuevamente.';
      }
    });
  }

  get estadoPago(): 'exento' | 'pagado' | 'pendiente' {
    if (this.ficha?.beca) return 'exento';
    if (this.pagosMensuales?.mesActual?.estado === 'pagado') return 'pagado';
    return 'pendiente';
  }

  get mesesNombres(): string[] {
    return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  }

  promedioBarWidth(valor: number): string {
    return `${valor}%`;
  }

  toggleTema() {
    this.temaOscuro = !this.temaOscuro;
    localStorage.setItem('tema', this.temaOscuro ? 'dark' : 'light');
  }

  cerrarSesion() {
    this.auth.logout();
    this.router.navigate(['/inicio']);
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
}

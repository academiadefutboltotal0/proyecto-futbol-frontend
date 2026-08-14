import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Pago } from '../models/pago';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient, private readonly authService: AuthService) {}

  private get authHeaders(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken() ?? ''}` }),
    };
  }

  ping(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/ping`);
  }

  getConfig(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/config`);
  }

  updateConfig(config: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/config`, config, this.authHeaders);
  }

  getNoticias(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/noticias`);
  }

  saveNoticia(noticia: any, id?: string): Observable<any> {
    return id
      ? this.http.put(`${this.apiUrl}/noticias/${id}`, noticia, this.authHeaders)
      : this.http.post(`${this.apiUrl}/noticias`, noticia, this.authHeaders);
  }

  deleteNoticia(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/noticias/${id}`, this.authHeaders);
  }

  getInscripciones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/inscripciones`, this.authHeaders);
  }

  aprobarInscripcion(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/aprobar/${id}`, {}, this.authHeaders);
  }

  rechazarInscripcion(id: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/rechazar/${id}`, {}, this.authHeaders);
  }

  getEstudiantes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/estudiantes`, this.authHeaders);
  }

  saveEstudiante(estudiante: any, id?: string): Observable<any> {
    return id
      ? this.http.put(`${this.apiUrl}/estudiantes/${id}`, estudiante, this.authHeaders)
      : this.http.post(`${this.apiUrl}/estudiantes`, estudiante, this.authHeaders);
  }

  deleteEstudiante(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/estudiantes/${id}`, this.authHeaders);
  }

  getProfesores(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/profesores`, this.authHeaders);
  }

  saveProfesor(profesor: any, id?: string): Observable<any> {
    return id
      ? this.http.put(`${this.apiUrl}/profesores/${id}`, profesor, this.authHeaders)
      : this.http.post(`${this.apiUrl}/profesores`, profesor, this.authHeaders);
  }

  deleteProfesor(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/profesores/${id}`, this.authHeaders);
  }

  getDivisiones(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/divisiones`, this.authHeaders);
  }

  saveDivision(division: any, id?: string): Observable<any> {
    return id
      ? this.http.put(`${this.apiUrl}/divisiones/${id}`, division, this.authHeaders)
      : this.http.post(`${this.apiUrl}/divisiones`, division, this.authHeaders);
  }

  deleteDivision(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/divisiones/${id}`, this.authHeaders);
  }

  getPartidos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/partidos`);
  }

  savePartido(partido: any, id?: string): Observable<any> {
    return id
      ? this.http.put(`${this.apiUrl}/partidos/${id}`, partido, this.authHeaders)
      : this.http.post(`${this.apiUrl}/partidos`, partido, this.authHeaders);
  }

  deletePartido(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/partidos/${id}`, this.authHeaders);
  }

  getPago(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/pagos/${id}`, this.authHeaders);
  }

  getPlanteles(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/planteles`);
  }

  crearInscripcion(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/inscripcion`, payload);
  }

  login(data: { user: string; password: string }): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/login`, data);
  }

  getPagosPendientes(): Observable<Pago[]> {
    return this.http.get<Pago[]>(`${this.apiUrl}/pagos?estado=pendiente`, this.authHeaders);
  }

  updateEstadoPago(id: string, estado: string): Observable<Pago> {
    return this.http.patch<Pago>(`${this.apiUrl}/pagos/${id}/estado`, { estado }, this.authHeaders);
  }
  crearFichaTemporada(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/ficha-temporada`, data);
  }

  generarInvitacion(): Observable<{ token: string }> {
    return this.http.post<{ token: string }>(`${this.apiUrl}/admin/generar-invitacion`, {}, this.authHeaders);
  }

  validarInvitacion(token: string): Observable<{ valido: boolean }> {
    return this.http.get<{ valido: boolean }>(`${this.apiUrl}/invitacion/${token}`);
  }

  validarActivacionCuenta(token: string): Observable<{ valido: boolean; email: string; nombre: string }> {
    return this.http.get<any>(`${this.apiUrl}/activar-cuenta/${token}`);
  }

  activarCuenta(token: string, passwordNueva: string): Observable<{ mensaje: string }> {
    return this.http.post<any>(`${this.apiUrl}/activar-cuenta/${token}`, { passwordNueva });
  }

  getMiFicha(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cliente/mi-ficha`, this.authHeaders);
  }

  crearClienteFicha(fichaId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admin/crear-cliente-ficha/${fichaId}`, {}, this.authHeaders);
  }

  getPerfilProfesor(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profesor/mi-perfil`, this.authHeaders);
  }

  getMisFichas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/profesor/mis-fichas`, this.authHeaders);
  }

  getAsistenciasProfesor(fecha?: string): Observable<any[]> {
    const url = fecha
      ? `${this.apiUrl}/profesor/asistencias?fecha=${fecha}`
      : `${this.apiUrl}/profesor/asistencias`;
    return this.http.get<any[]>(url, this.authHeaders);
  }

  guardarAsistenciasLote(fecha: string, registros: { jugadorId: string; estado: string }[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/profesor/asistencias/lote`, { fecha, registros }, this.authHeaders);
  }

  getLibroAdmin(mes: string, categoria?: string | null): Observable<any> {
    let url = `${this.apiUrl}/admin/asistencias/libro?mes=${mes}`;
    if (categoria) url += `&categoria=${encodeURIComponent(categoria)}`;
    return this.http.get<any>(url, this.authHeaders);
  }

  getLibroProfesor(mes: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/profesor/asistencias/libro?mes=${mes}`, this.authHeaders);
  }

  marcarPagoMensual(fichaId: string, estado: 'pagado' | 'pendiente'): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/pago-mensual/${fichaId}`, { estado }, this.authHeaders);
  }

  getMisPagosMensuales(fichaId?: string): Observable<any> {
    const url = fichaId
      ? `${this.apiUrl}/cliente/mis-pagos-mensuales?fichaId=${fichaId}`
      : `${this.apiUrl}/cliente/mis-pagos-mensuales`;
    return this.http.get<any>(url, this.authHeaders);
  }

  getMiRendimiento(fichaId?: string): Observable<any> {
    const url = fichaId
      ? `${this.apiUrl}/cliente/mi-rendimiento?fichaId=${fichaId}`
      : `${this.apiUrl}/cliente/mi-rendimiento`;
    return this.http.get<any>(url, this.authHeaders);
  }

  guardarRendimientoProfesor(fecha: string, registros: any[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/profesor/rendimiento`, { fecha, registros }, this.authHeaders);
  }

  getRendimientoProfesorFecha(fecha: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/profesor/rendimiento?fecha=${fecha}`, this.authHeaders);
  }

  getRendimientoJugador(jugadorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/admin/rendimiento/${jugadorId}`, this.authHeaders);
  }

  editarAsistenciaAdmin(jugadorId: string, fecha: string, estado: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/admin/asistencias/editar`, { jugadorId, fecha, estado }, this.authHeaders);
  }

  getMisFichasCliente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/cliente/mis-fichas`, this.authHeaders);
  }
}

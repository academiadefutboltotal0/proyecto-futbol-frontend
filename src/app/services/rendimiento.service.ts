import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class RendimientoService {

  private apiUrl = `${environment.apiUrl}/rendimientos`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  private get headers() {
    return { headers: new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken() ?? ''}` }) };
  }

  crearRendimiento(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data, this.headers);
  }

  editarRendimiento(id: string, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data, this.headers);
  }

  obtenerRendimientos(jugadorId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${jugadorId}`, this.headers);
  }

  obtenerResumen(jugadorId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/resumen/${jugadorId}`, this.headers);
  }
}

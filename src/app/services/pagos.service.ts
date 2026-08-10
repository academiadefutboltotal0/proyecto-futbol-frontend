import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { EstadoPago, Pago } from '../models/pago';
import { AuthService } from './auth.service';

export interface CrearPagoDto {
  apoderado: string;
  alumno: string;
  sede: string;
  monto: number;
  fecha: string;
  voucherBase64: string;
  fichaId?: string;
}

interface PagoMongoResponse {
  _id: string;
  apoderado: string;
  alumno: string;
  sede: string;
  monto: number;
  fecha: string;
  voucherBase64: string;
  estado: EstadoPago;
}

function fromMongoPago(pago: PagoMongoResponse): Pago {
  return {
    id: pago._id,
    apoderado: pago.apoderado,
    alumno: pago.alumno,
    sede: pago.sede,
    monto: pago.monto,
    fecha: pago.fecha,
    voucherBase64: pago.voucherBase64,
    estado: pago.estado,
  };
}

@Injectable({
  providedIn: 'root',
})
export class PagosService {
  private readonly apiUrl = `${environment.apiUrl}/pagos`;
  private readonly authService = inject(AuthService);

  constructor(private readonly http: HttpClient) {}

  private authHeaders(): { headers: HttpHeaders } {
    return {
      headers: new HttpHeaders({ Authorization: `Bearer ${this.authService.getToken()}` })
    };
  }

  postPago(payload: CrearPagoDto): Observable<Pago> {
    return this.http.post<PagoMongoResponse>(this.apiUrl, {
      ...payload,
      estado: 'pendiente',
    }, this.authHeaders()).pipe(map(fromMongoPago));
  }

  getPagosPendientes(): Observable<Pago[]> {
    return this.http.get<PagoMongoResponse[]>(`${this.apiUrl}?estado=pendiente`, this.authHeaders()).pipe(
      map((pagos) => pagos.map(fromMongoPago))
    );
  }

  getPagosAprobados(): Observable<Pago[]> {
    return this.http.get<PagoMongoResponse[]>(`${this.apiUrl}?estado=aprobado`, this.authHeaders()).pipe(
      map((pagos) => pagos.map(fromMongoPago))
    );
  }

  updateEstadoPago(id: string, estado: EstadoPago): Observable<Pago> {
    return this.http.patch<PagoMongoResponse>(`${this.apiUrl}/${id}/estado`, { estado }, this.authHeaders()).pipe(
      map(fromMongoPago)
    );
  }
}
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { APIResponse } from '../models/APIResponse.model';
import { StaffUser, NewStaffPayload } from './staff.model';

@Injectable({
  providedIn: 'root'
})
export class StaffService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/staff'; // O l'URL mappato dal proxy gateway

  // Recupera l'elenco dello staff
  getAllStaff(): Observable<APIResponse<StaffUser[]>> {
    return this.http.get<APIResponse<StaffUser[]>>(this.baseUrl);
  }

  // Verifica disponibilità dello username per AsyncValidator
  checkUsernameAvailable(username: string): Observable<boolean> {
    return this.http.get<APIResponse<{ available: boolean }>>(`${this.baseUrl}/check-username/${username}`)
      .pipe(
        map(res => !!res.data?.available)
      );
  }

  // Creazione nuovo operatore
  createStaff(payload: NewStaffPayload): Observable<APIResponse<StaffUser>> {
    return this.http.post<APIResponse<StaffUser>>(this.baseUrl, payload);
  }

  // Modifica ruolo operatore (PATCH /staff/:id)
  updateStaffRole(id: number, role: string): Observable<APIResponse<StaffUser>> {
    return this.http.patch<APIResponse<StaffUser>>(`${this.baseUrl}/${id}/role`, { role });
  }
}
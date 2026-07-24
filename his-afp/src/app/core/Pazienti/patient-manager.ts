import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  DischargedAdmissionReport,
  PatientAdmission,
  PatientAdmissionRes,
  Paziente,
  PazienteDTO,
  PatientSearchQuery,
} from './Pazienti.model';
import { HttpClient } from '@angular/common/http';
import { APIResponse } from '../models/APIResponse.model';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class PatientManager {
  timer_id = signal<number>(-1);
  #http = inject(HttpClient);
  readonly #router = inject(Router);
  #listaPZ = signal<Paziente[]>([]);
  #listaPZFiltered = signal<Paziente[]>(this.#listaPZ());
  listaPZ = this.#listaPZFiltered.asReadonly();

  // constructor() {
  //   this.fetchPazienti();
  // }

  /**
   * Creazione timer di t secondi
   */
  public refreshPazienti() {
    if (this.timer_id() >= 0) return;
    let id = setInterval(() => this.fetchPazienti(), 1000);
    this.timer_id.set(id);
  }

  public stopRefreshPazienti() {
    clearInterval(this.timer_id());
    this.timer_id.set(-1);
  }

  public fetchPazienti() {
    this.#http.get<APIResponse<PazienteDTO[]>>(`/api/admissions`).subscribe({
      next: (res) => {
        const pz = res.data.map((p) => this.mapPazienteDTOToPaziente(p));
        this.#listaPZ.set(pz);
      },
      error: (err) => {
        console.error('Errore durante il fetch dei pazienti:', err);
      },
    });
  }

  public admitPatient(
    pz: PatientAdmission,
    onSuccess?: () => void,
    onError?: (errorMessage: string) => void,
  ) {
    this.#http
      .post<APIResponse<PatientAdmissionRes>>(`${environment.apiUrl}/admissions`, pz)
      .subscribe({
        next: (res) => {
          if (onSuccess) {
            try {
              onSuccess();
            } catch (e) {
              console.error('onSuccess callback error', e);
            }
          }
        },
        error: (err) => {
          console.error("Errore durante l'ammissione del paziente:", err);
          if (onError) {
            const message = err?.error?.message ?? "Errore durante l'ammissione del paziente.";
            onError(message);
          }
        },
      });
  }

  public updatePatientInfo(patientOrAdmissionId: number, residenza: PatientAdmission['residenza'], onSuccess?: () => void) {
    this.#http
      .patch<APIResponse<PatientAdmissionRes>>(`${environment.apiUrl}/patients/${patientOrAdmissionId}`, residenza)
      .subscribe({
        next: (res) => {
          if (onSuccess) {
            onSuccess();
          } else {
            this.#router.navigate([`/lista-pz`]);
          }
        },
        error: (err) => {
          console.error("Errore durante l'aggiornamento delle informazioni del paziente:", err);
        },
      });
  }

  public changeAdmissionStatus(
    admissionId: number,
    nuovoStato: 'ATT' | 'VIS' | 'OBI' | 'RIC' | 'DIM',
    onSuccess?: () => void,
  ) {
    this.#http
      .patch<APIResponse<{ id: number; stato: string; dataOraDimissione?: string }>>(
        `${environment.apiUrl}/admissions/${admissionId}/status`,
        { nuovoStato },
      )
      .subscribe({
        next: () => {
          if (onSuccess) {
            onSuccess();
          } else {
            this.fetchPazienti();
          }
        },
        error: (err) => {
          console.error("Errore durante l'aggiornamento dello stato accesso:", err);
        },
      });
  }

  public deletePatient(patientOrAdmissionId: number, onSuccess?: () => void) {
    this.#http.delete<APIResponse<{ patient: { id: number; nome: string; cognome: string }; deletedAdmissions: number }>>(
      `${environment.apiUrl}/patients/${patientOrAdmissionId}`,
    ).subscribe({
      next: () => {
        if (onSuccess) {
          onSuccess();
        } else {
          this.#router.navigate([`/lista-pz`]);
        }
      },
      error: (err) => {
        console.error('Errore durante la cancellazione del paziente:', err);
      },
    });
  }

  public deleteAdmission(admissionId: number, onSuccess?: () => void) {
    this.#http
      .delete<APIResponse<{ id: number; patientId: number; braccialetto: string }>>(
        `${environment.apiUrl}/admissions/${admissionId}`,
      )
      .subscribe({
        next: () => {
          if (onSuccess) {
            onSuccess();
          } else {
            this.#router.navigate([`/lista-pz`]);
          }
        },
        error: (err) => {
          console.error("Errore durante l'eliminazione dell'accesso:", err);
        },
      });
  }

  public searchPatient(query: PatientSearchQuery): Observable<APIResponse<PazienteDTO[]>> {
    const params: Record<string, string> = {};
    if (query['cf']) params['cf'] = query['cf'] as string;
    if (query['nome']) params['nome'] = query['nome'] as string;
    if (query['cognome']) params['cognome'] = query['cognome'] as string;
    if (query['dataNascita']) params['data_nascita'] = query['dataNascita'] as string;

    return this.#http.get<APIResponse<PazienteDTO[]>>(`${environment.apiUrl}/patients/search`, {
      params,
    });
  }

  public getDischargedAdmissions(): Observable<APIResponse<DischargedAdmissionReport[]>> {
    return this.#http.get<APIResponse<DischargedAdmissionReport[]>>(
      `${environment.apiUrl}/admissions/reports/discharged`,
    );
  }

  public mapPazienteDTOToPaziente(pz: PazienteDTO): Paziente {
    return {
      id: pz.id.toString(),
      nome: pz.nome,
      cognome: pz.cognome,
      braccialetto: pz.braccialetto,
      codiceColore: pz.coloreCode,
      note: pz.noteTriage,
      patologia: pz.patologiaCode,
      eta: this.calcolaEta(pz.dataNascita),
    };
  }

  public calcolaEta(dataNascita: string): number {
    const today = new Date();
    const birthDate = new Date(dataNascita);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  }

  public filterByName(name: string) {
    const filtered = this.#listaPZ().filter((p) => {
      const fullName = `${p.nome} ${p.cognome}`.toLowerCase();
      return fullName.includes(name.toLowerCase());
    });
    this.#listaPZFiltered.set(filtered);
  }
}

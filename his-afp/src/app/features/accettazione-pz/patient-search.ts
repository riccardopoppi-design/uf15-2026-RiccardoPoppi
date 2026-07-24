import { ChangeDetectionStrategy, Component, EventEmitter, inject, Output } from '@angular/core';
import { CommonModule, formatDate } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Button } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { Message } from 'primeng/message';
import { PatientManager } from '../../core/Pazienti/patient-manager';
import { PazienteDTO, PatientSearchQuery } from '../../core/Pazienti/Pazienti.model';

@Component({
  selector: 'his-patient-search',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputText, Button, TableModule, Message],
  template: `
    <div class="patient-search-panel flex flex-col gap-4 p-4 rounded-lg shadow-sm">
      <div class="flex flex-row items-center justify-between gap-4">
        <div>
          <h2 class="patient-search-title text-lg font-semibold">Ricerca Paziente</h2>
          <p class="patient-search-subtitle text-sm">Cerca per codice fiscale oppure nome, cognome e data di nascita.</p>
        </div>
        <p-button label="Nuovo paziente" severity="secondary" (onClick)="createNewPatient()"></p-button>
      </div>

      <form [formGroup]="searchForm" (submit)="onSearch($event)" class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="flex flex-col gap-2">
          <label for="cf">Codice Fiscale</label>
          <input id="cf" pInputText formControlName="cf" placeholder="AAAAAA00A00A000A" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="nome">Nome</label>
          <input id="nome" pInputText formControlName="nome" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="cognome">Cognome</label>
          <input id="cognome" pInputText formControlName="cognome" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="dataNascita">Data di nascita</label>
          <input id="dataNascita" pInputText formControlName="dataNascita" placeholder="YYYY-MM-DD" />
        </div>

        <div class="col-span-full flex flex-row gap-3 justify-end">
          <p-button label="Cerca" type="submit"></p-button>
        </div>
      </form>

      <div *ngIf="errorMessage" class="max-w-2xl">
        <p-message severity="error" text="{{ errorMessage }}"></p-message>
      </div>

      <div *ngIf="searchDone && !searchResults.length" class="patient-search-empty text-sm">
        Nessun paziente trovato con i criteri forniti.
      </div>

      <div *ngIf="searchResults.length" class="patient-search-table-wrap overflow-x-auto">
        <table class="patient-search-table min-w-full text-left border-collapse">
          <thead>
            <tr class="patient-search-head-row">
              <th class="px-3 py-2">Nome</th>
              <th class="px-3 py-2">Cognome</th>
              <th class="px-3 py-2">CF</th>
              <th class="px-3 py-2">Nascita</th>
              <th class="px-3 py-2">Sesso</th>
              <th class="px-3 py-2">Seleziona</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let patient of searchResults" class="patient-search-body-row border-t">
              <td class="px-3 py-2">{{ patient.nome }}</td>
              <td class="px-3 py-2">{{ patient.cognome }}</td>
              <td class="px-3 py-2">{{ patient.codiceFiscale }}</td>
              <td class="px-3 py-2">{{ patient.dataNascita | date:'dd/MM/yyyy' }}</td>
              <td class="px-3 py-2">{{ patient.sex }}</td>
              <td class="px-3 py-2">
                <p-button label="Seleziona" size="small" (onClick)="selectPatient(patient)"></p-button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [
    `
      .patient-search-panel {
        background: var(--p-content-background);
        border: 1px solid var(--p-content-border-color);
      }

      .patient-search-title,
      .patient-search-table {
        color: var(--p-text-color);
      }

      .patient-search-subtitle,
      .patient-search-empty {
        color: var(--p-text-muted-color);
      }

      .patient-search-head-row {
        background: var(--p-content-hover-background);
        color: var(--p-text-color);
      }

      .patient-search-body-row {
        border-color: var(--p-content-border-color);
        transition: background-color 0.15s ease-in-out;
      }

      .patient-search-body-row:hover {
        background: var(--p-content-hover-background);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PatientSearch {
  @Output() patientSelected = new EventEmitter<PazienteDTO>();
  @Output() newPatient = new EventEmitter<void>();

  readonly #fb = inject(FormBuilder);
  readonly patientManager = inject(PatientManager);

  searchForm = this.#fb.group({
    cf: ['', [Validators.pattern('[A-Z]{6}\\d{2}[A-Z]\\d{2}[A-Z]\\d{3}[A-Z]')]],
    nome: [''],
    cognome: [''],
    dataNascita: [''],
  });

  searchResults: PazienteDTO[] = [];
  errorMessage = '';
  searchDone = false;

  private normalizeSearchRow(row: PazienteDTO): PazienteDTO {
    const source = row as PazienteDTO & {
      codice_fiscale?: string;
      data_nascita?: string;
      indirizzo_via?: string;
      indirizzo_civico?: string;
    };

    return {
      ...source,
      codiceFiscale: source.codiceFiscale ?? source.codice_fiscale ?? '',
      dataNascita: source.dataNascita ?? source.data_nascita ?? '',
      indirizzoVia: source.indirizzoVia ?? source.indirizzo_via ?? '',
      indirizzoCivico: source.indirizzoCivico ?? source.indirizzo_civico ?? '',
    };
  }

  onSearch(event: Event) {
    event.preventDefault();
    this.errorMessage = '';
    this.searchDone = false;
    const cf = this.searchForm.get('cf')?.value?.trim().toUpperCase();
    const nome = this.searchForm.get('nome')?.value?.trim();
    const cognome = this.searchForm.get('cognome')?.value?.trim();
    const dataNascitaRaw = this.searchForm.get('dataNascita')?.value?.trim();

    if (!cf && !nome && !cognome && !dataNascitaRaw) {
      this.errorMessage = 'Inserisci il codice fiscale oppure compila nome, cognome e data di nascita.';
      return;
    }

    const payload: PatientSearchQuery = {};

    if (cf) {
      payload.cf = cf;
    } else {
      if (!nome || !cognome || !dataNascitaRaw) {
        this.errorMessage = 'Per la ricerca anagrafica servono nome, cognome e data di nascita.';
        return;
      }

      const dataNascita = this.normalizeDate(dataNascitaRaw);
      if (!dataNascita) {
        this.errorMessage = 'La data di nascita deve essere valida nel formato YYYY-MM-DD.';
        return;
      }

      payload.nome = nome;
      payload.cognome = cognome;
      payload.dataNascita = dataNascita;
    }

    this.patientManager.searchPatient(payload).subscribe({
      next: (res) => {
        this.searchResults = res.data.map((row) => this.normalizeSearchRow(row));
        this.searchDone = true;
      },
      error: (err) => {
        this.errorMessage = 'Errore durante la ricerca del paziente.';
        console.error('Ricerca paziente fallita', err);
      },
    });
  }

  selectPatient(patient: PazienteDTO) {
    this.patientSelected.emit(patient);
  }

  createNewPatient() {
    this.searchResults = [];
    this.searchDone = false;
    this.errorMessage = '';
    this.newPatient.emit();
  }

  normalizeDate(raw?: string): string | null {
    if (!raw) return null;
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return formatDate(parsed, 'yyyy-MM-dd', 'en-US');
  }
}

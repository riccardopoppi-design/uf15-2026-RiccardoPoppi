import { ChangeDetectionStrategy, Component, effect, inject, input, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { PatientAdmission, PazienteDTO } from '../../core/Pazienti/Pazienti.model';
import { APIResponse } from '../../core/models/APIResponse.model';
import { Button } from 'primeng/button';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Fieldset } from 'primeng/fieldset';
import { InputText } from 'primeng/inputtext';
import { Message } from 'primeng/message';
import { Select } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { GestioneRisorse } from '../../core/Risorse/gestione-risorse';
import { formatDate } from '@angular/common';
import { PatientManager } from '../../core/Pazienti/patient-manager';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'his-modifica-pz',
  imports: [
    Button,
    DatePicker,
    Fieldset,
    FormsModule,
    InputText,
    Message,
    ReactiveFormsModule,
    Select,
    Textarea,
  ],
  templateUrl: './modifica-pz.html',
  styleUrl: './modifica-pz.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModificaPz {
  patientId = input<string>();
  gestioneRisorse = inject(GestioneRisorse);
  patientManager = inject(PatientManager);
  readonly #router = inject(Router);
  patientReq = httpResource<APIResponse<PazienteDTO>>(
    () => `${environment.apiUrl}/admissions/${this.patientId()}`,
  );
  readonly maxDate = new Date();
  readonly sexOption = [
    {
      code: 'M',
      desc: 'Maschio',
    },
    {
      code: 'F',
      desc: 'Femmina',
    },
  ];

  readonly #fb = inject(FormBuilder);
  paziente = this.#fb.group({
    anagrafica: this.#fb.group({
      nome: ['', [Validators.required]],
      cognome: ['', [Validators.required]],
      dataNascita: ['', [Validators.required]],
      codiceFiscale: [
        '',
        [Validators.required, Validators.pattern('[A-Z]{6}\\d{2}[A-Z]\\d{2}[A-Z]\\d{3}[A-Z]')],
        // {pattern: {requiredPattern: '^[a-zA-Z ]*$', actualValue: '1'}}
      ],
      sesso: ['', [Validators.required]],
    }),
    sanitaria: this.#fb.group({
      patologia: ['', [Validators.required]],
      codiceColore: ['', [Validators.required]],
      modArrivo: ['', [Validators.required]],
      noteTriage: ['', [Validators.required, Validators.maxLength(500)]],
    }),
    residenza: this.#fb.group({
      via: ['', [Validators.required]],
      civico: ['', [Validators.required]],
      comune: ['', [Validators.required]],
      provincia: ['', [Validators.required, Validators.maxLength(5)]],
    }),
  });

  constructor() {
    effect(() => {
      if (this.patientId() === undefined) {
        console.warn(
          'Patient ID is undefined. Please provide a valid patient ID in the route parameters.',
        );
      }

      if (this.patientReq.hasValue()) {
        const data = this.patientReq.value().data;
        untracked(() => {
          this.paziente.patchValue({
            anagrafica: {
              nome: data.nome,
              cognome: data.cognome,
              dataNascita: formatDate(data.dataNascita, 'dd/MM/yyyy', 'en'),
              codiceFiscale: data.codiceFiscale,
              sesso: data.sex,
            },
            sanitaria: {
              patologia: data.patologiaCode,
              modArrivo: data.modalitaArrivoCode,
              noteTriage: data.noteTriage,
              codiceColore: data.coloreCode,
            },
            residenza: {
              via: data.indirizzoVia,
              civico: data.indirizzoCivico,
              comune: data.comune,
              provincia: data.provincia,
            },
          });
          this.paziente.get('anagrafica')?.disable();
          this.paziente.get('sanitaria')?.disable();
        });
      }
    });
  }

  checkFormControl(control: string) {
    const fc = this.paziente.get(control);
    // nome.invalid && (nome.touched || nome.dirty)
    return fc?.invalid && (fc.touched || fc.dirty);
  }

  checkFormControlError(control: string, err: string) {
    const fc = this.paziente.get(control);

    if (fc && fc.hasError(err)) {
      return fc.getError(err);
    } else {
      return null;
    }
  }

  onSubmit() {
    if (this.paziente.valid) {
      console.log(this.paziente.value);
      const admission = this.patientReq.hasValue() ? this.patientReq.value().data : null;
      const patientId = admission ? admission.patientId : undefined;
      if (!patientId) {
        console.error('Impossibile determinare patientId per l\'aggiornamento della residenza');
        return;
      }
      this.patientManager.updatePatientInfo(
        Number(patientId) || -1,
        this.paziente.value.residenza as PatientAdmission['residenza'],
        () => {
          // Al successo chiudo/navigo verso la lista e mostro un messaggio
          this.#router.navigate(['/lista-pz']);
        },
      );
    } else {
      this.paziente.markAllAsTouched();
    }
  }

  onDeleteAdmission() {
    const admissionId = Number(this.patientId());

    if (!Number.isInteger(admissionId) || admissionId <= 0) {
      console.error('Impossibile determinare admissionId per la cancellazione accesso');
      return;
    }

    const confirmed = window.confirm(
      "Confermi l'eliminazione del solo accesso corrente?",
    );

    if (!confirmed) return;

    this.patientManager.deleteAdmission(admissionId, () => {
      this.#router.navigate(['/lista-pz']);
    });
  }

  onDeletePatient() {
    const admission = this.patientReq.hasValue() ? this.patientReq.value().data : null;
    const patientId = admission ? admission.patientId : undefined;

    if (!patientId) {
      console.error('Impossibile determinare patientId per la cancellazione');
      return;
    }

    const confirmed = window.confirm(
      'Confermi l\'eliminazione del paziente? Verranno eliminati anche gli accessi collegati.',
    );

    if (!confirmed) return;

    this.patientManager.deletePatient(Number(patientId) || -1, () => {
      this.#router.navigate(['/lista-pz']);
    });
  }
}

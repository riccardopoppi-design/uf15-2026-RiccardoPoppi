import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GestioneRisorse } from '../../core/Risorse/gestione-risorse';
import { InputText } from 'primeng/inputtext';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from 'primeng/button';
import { Message } from 'primeng/message';
import { DatePicker } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Fieldset } from 'primeng/fieldset';
import { PatientManager } from '../../core/Pazienti/patient-manager';
import { PazienteDTO, PatientAdmission } from '../../core/Pazienti/Pazienti.model';
import { PatientSearch } from './patient-search';

@Component({
  selector: 'his-accettazione-pz',
  standalone: true,
  imports: [
    CommonModule,
    InputText,
    ReactiveFormsModule,
    Button,
    Message,
    DatePicker,
    SelectModule,
    Textarea,
    Fieldset,
    PatientSearch,
  ],
  templateUrl: './accettazione-pz.html',
  styleUrl: './accettazione-pz.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccettazionePz {
  gestioneRisorse = inject(GestioneRisorse);
  patientManager = inject(PatientManager);

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
  showForm = signal(false);
  selectedPatient = signal<PazienteDTO | null>(null);

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
      via: [''],
      civico: [''],
      comune: [''],
      provincia: [''],
    }),
  });

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
      this.patientManager.admitPatient(this.paziente.value as PatientAdmission);
    } else {
      this.paziente.markAllAsTouched();
    }
  }

  openNewPatientForm() {
    this.selectedPatient.set(null);
    this.paziente.reset();
    this.showForm.set(true);
  }

  onPatientSelected(patient: PazienteDTO) {
    this.selectedPatient.set(patient);
    this.showForm.set(true);
    const birthDate = patient.dataNascita ? new Date(patient.dataNascita) : null;
    // patchValue expects types compatible with form controls; cast to any to allow Date for datepicker
    this.paziente.patchValue({
      anagrafica: {
        nome: patient.nome,
        cognome: patient.cognome,
        dataNascita: (birthDate as unknown) as string,
        codiceFiscale: patient.codiceFiscale,
        sesso: patient.sex,
      },
      sanitaria: {
        patologia: '',
        codiceColore: '',
        modArrivo: '',
        noteTriage: '',
      },
      residenza: {
        via: '',
        civico: '',
        comune: '',
        provincia: '',
      },
    });
  }
}

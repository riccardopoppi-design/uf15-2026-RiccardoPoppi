import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Fieldset } from 'primeng/fieldset';
import { InputText } from 'primeng/inputtext';
import { DatePicker } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { Textarea } from 'primeng/textarea';
import { Message } from 'primeng/message';
import { Button } from 'primeng/button';
import { GestioneRisorse } from '../../core/Risorse/gestione-risorse';
import { PatientAdmission, PazienteDTO } from '../../core/Pazienti/Pazienti.model';
import { PatientManager } from '../../core/Pazienti/patient-manager';

@Component({
  selector: 'his-accettazione-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogModule,
    Fieldset,
    InputText,
    DatePicker,
    SelectModule,
    Textarea,
    Message,
    Button,
  ],
  templateUrl: './accettazione-form.html',
  styleUrl: './accettazione-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccettazioneForm {
  selectedPatient = input<PazienteDTO | null>(null);
  closed = output<void>();

  readonly gestioneRisorse = inject(GestioneRisorse);
  readonly patientManager = inject(PatientManager);
  readonly maxDate = new Date();
  readonly sexOption = [
    { code: 'M', desc: 'Maschio' },
    { code: 'F', desc: 'Femmina' },
  ];

  readonly #fb = inject(FormBuilder);
  readonly saveError = signal('');
  readonly dialogVisible = signal(true);

  paziente = this.#fb.group({
    anagrafica: this.#fb.group({
      nome: ['', [Validators.required]],
      cognome: ['', [Validators.required]],
      dataNascita: ['', [Validators.required]],
      codiceFiscale: [
        '',
        [Validators.required, Validators.pattern('[A-Z]{6}\\d{2}[A-Z]\\d{2}[A-Z]\\d{3}[A-Z]')],
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

  constructor() {
    effect(() => {
      this.applySelectedPatient(this.selectedPatient());
    });
  }

  checkFormControl(control: string) {
    const fc = this.paziente.get(control);
    return fc?.invalid && (fc.touched || fc.dirty);
  }

  checkFormControlError(control: string, err: string) {
    const fc = this.paziente.get(control);
    if (fc && fc.hasError(err)) {
      return fc.getError(err);
    }
    return null;
  }

  private enableAllSections() {
    this.paziente.get('anagrafica')?.enable();
    this.paziente.get('sanitaria')?.enable();
    this.paziente.get('residenza')?.enable();
  }

  private applySelectedPatient(patient: PazienteDTO | null) {
    this.saveError.set('');
    this.enableAllSections();
    this.paziente.reset();

    if (!patient) {
      return;
    }

    const selected = patient as PazienteDTO & {
      data_nascita?: string;
      codice_fiscale?: string;
      indirizzo_via?: string;
      indirizzo_civico?: string;
    };

    const dataNascita = selected.dataNascita ?? selected.data_nascita ?? '';
    const codiceFiscale = selected.codiceFiscale ?? selected.codice_fiscale ?? '';
    const via = selected.indirizzoVia ?? selected.indirizzo_via ?? '';
    const civico = selected.indirizzoCivico ?? selected.indirizzo_civico ?? '';
    const comune = selected.comune ?? '';
    const provincia = selected.provincia ?? '';

    const birthDate = dataNascita ? new Date(dataNascita) : null;

    this.paziente.patchValue({
      anagrafica: {
        nome: selected.nome,
        cognome: selected.cognome,
        dataNascita: (birthDate as unknown) as string,
        codiceFiscale,
        sesso: selected.sex,
      },
      sanitaria: {
        patologia: '',
        codiceColore: '',
        modArrivo: '',
        noteTriage: '',
      },
      residenza: {
        via,
        civico,
        comune,
        provincia,
      },
    });

    this.paziente.get('anagrafica')?.disable();
    this.paziente.get('residenza')?.disable();
    this.paziente.get('sanitaria')?.enable();
  }

  onSubmit() {
    if (this.paziente.valid) {
      this.saveError.set('');
      this.patientManager.admitPatient(
        this.paziente.getRawValue() as PatientAdmission,
        () => {
          this.dialogVisible.set(false);
        },
        (errorMessage) => {
          this.saveError.set(errorMessage);
        },
      );
    } else {
      this.paziente.markAllAsTouched();
    }
  }

  onReset() {
    this.applySelectedPatient(this.selectedPatient());
  }

  onClose() {
    this.dialogVisible.set(false);
  }

  onDialogHide() {
    this.closed.emit();
  }
}

import { ChangeDetectionStrategy, Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { StaffService } from '../../core/Staff/staff.service';
import { StaffUser } from '../../core/Staff/staff.model';
import { UsernameValidators } from './username.validator';

// Componenti UI PrimeNG richiesti
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MessageModule } from 'primeng/message';
import { DialogModule } from 'primeng/dialog';

@Component({
  selector: 'his-gestione-personale',
  imports: [
    ReactiveFormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    MessageModule,
    DialogModule
  ],
  templateUrl: './gestione-personale.html',
  styleUrl: './gestione-personale.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GestionePersonaleComponent implements OnInit {
  private readonly staffService = inject(StaffService);
  private readonly fb = inject(FormBuilder);

  // Gestione dello Stato locale con i Signals (Angular 20+)
  staffList = signal<StaffUser[]>([]);
  isLoading = signal<boolean>(false);
  isDialogVisible = signal<boolean>(false);
  isEditMode = signal<boolean>(false);
  selectedUserId = signal<number | null>(null);

  roles = [
    { label: 'Medico', value: 'MED' },
    { label: 'Infermiere', value: 'INF' },
    { label: 'Amministrativo', value: 'AMM' }
  ];

  // Definizione Reactive Form strutturata
  staffForm = this.fb.group({
    username: ['', {
      validators: [Validators.required, Validators.minLength(4)],
      asyncValidators: [UsernameValidators.createValidator(this.staffService)],
      updateOn: 'change' // Avvia la validazione al variare dell'input
    }],
    password: ['', [Validators.required, Validators.minLength(4)]],
    role: ['', [Validators.required]]
  });

  ngOnInit(): void {
  this.loadStaff();
}

  loadStaff(): void {
    this.isLoading.set(true);
    this.staffService.getAllStaff().subscribe({
      next: (res) => {
        if (res.status === 'success' && res.data) {
          this.staffList.set(res.data);
        }
        this.isLoading.set(false);
      },
      error: () => this.isLoading.set(false)
    });
  }

  openNewDialog(): void {
    this.isEditMode.set(false);
    this.selectedUserId.set(null);
    this.staffForm.reset();
    
    // Ripristina i validatori per la creazione (password obbligatoria)
    this.staffForm.get('password')?.setValidators([Validators.required, Validators.minLength(4)]);
    this.staffForm.get('username')?.enable();
    
    this.isDialogVisible.set(true);
  }

  openEditDialog(user: StaffUser): void {
    if (user.id === undefined) return;
    
    this.isEditMode.set(true);
    this.selectedUserId.set(user.id);
    this.staffForm.reset();
    
// Sostituisci le righe dentro openEditDialog con questa sintassi sicura:
this.staffForm.get('username')?.setValue(user.username);
this.staffForm.get('username')?.disable();
this.staffForm.get('password')?.clearValidators();
this.staffForm.get('role')?.setValue(user.role); // <-- Aggiunto il punto di domanda
    
    this.isDialogVisible.set(true);
  }

  saveStaff(): void {
    if (this.staffForm.invalid) return;

    const formValue = this.staffForm.getRawValue();

    if (this.isEditMode()) {
      const id = this.selectedUserId();
      if (id !== null) {
        this.staffService.updateStaffRole(id, formValue.role || '').subscribe(() => {
          this.loadStaff();
          this.isDialogVisible.set(false);
        });
      }
    } else {
      const payload = {
        username: formValue.username || '',
        password: formValue.password || '',
        role: formValue.role || ''
      };
      this.staffService.createStaff(payload).subscribe(() => {
        this.loadStaff();
        this.isDialogVisible.set(false);
      });
    }
  }
}
import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { StaffService } from '../../core/Staff/staff.service';
import { Observable, of, timer } from 'rxjs';
import { switchMap, map, catchError } from 'rxjs/operators';

export class UsernameValidators {
  static createValidator(staffService: StaffService): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
      if (!control.value) {
        return of(null);
      }
      
      // Timer di 300ms per evitare chiamate a raffica (debounce)
      return timer(300).pipe(
        switchMap(() => staffService.checkUsernameAvailable(control.value)),
        map(isAvailable => (isAvailable ? null : { usernameTaken: true })),
        catchError(() => of(null)) // In caso di errore API non blocchiamo la form
      );
    };
  }
}
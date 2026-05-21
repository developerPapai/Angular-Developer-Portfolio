import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html'
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  changePasswordForm: FormGroup = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmNewPassword: ['', [Validators.required]]
  });

  isSaving = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  onSubmit() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmNewPassword } = this.changePasswordForm.value;

    if (newPassword !== confirmNewPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'New password and confirm password do not match.'
      });
      return;
    }

    this.isSaving = true;

    this.authService.changePassword({ currentPassword, newPassword }).subscribe({
      next: (res) => {
        this.isSaving = false;
        this.changePasswordForm.reset();
        
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: res.message || 'Password updated successfully!'
        });
      },
      error: (err) => {
        this.isSaving = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message || 'Failed to change password. Please check your current password.'
        });
      }
    });
  }
}

import { Component, inject, OnInit } from '@angular/core';
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
export class ChangePasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);

  changePasswordForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.minLength(6)]],
    confirmNewPassword: ['']
  });

  currentUser: any = null;
  isSaving = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  ngOnInit() {
    this.authService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user) {
          this.changePasswordForm.patchValue({
            email: user.email
          });
        }
      }
    });
  }

  onSubmit() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }

    const { email, currentPassword, newPassword, confirmNewPassword } = this.changePasswordForm.value;
    const emailChanged = email.toLowerCase() !== this.currentUser?.email?.toLowerCase();
    const passwordChanged = !!newPassword;

    if (!emailChanged && !passwordChanged) {
      Swal.fire({
        icon: 'info',
        title: 'No Changes',
        text: 'No changes were made. Please modify the email or enter a new password.'
      });
      return;
    }

    if (passwordChanged) {
      if (!confirmNewPassword) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please confirm your new password.'
        });
        return;
      }
      if (newPassword !== confirmNewPassword) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'New password and confirm password do not match.'
        });
        return;
      }
    }

    this.isSaving = true;

    const payload: any = { currentPassword };
    if (emailChanged) payload.email = email;
    if (passwordChanged) payload.password = newPassword;

    this.authService.updateAccount(payload).subscribe({
      next: (res) => {
        this.isSaving = false;
        
        // Reset password fields but retain/update the email
        this.changePasswordForm.patchValue({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: ''
        });

        // Reset control validation states for password fields
        ['currentPassword', 'newPassword', 'confirmNewPassword'].forEach(controlName => {
          const control = this.changePasswordForm.get(controlName);
          if (control) {
            control.markAsPristine();
            control.markAsUntouched();
            control.setErrors(null);
          }
        });

        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: res.message || 'Account updated successfully!'
        });
      },
      error: (err) => {
        this.isSaving = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error?.message || 'Failed to update account. Please check your credentials.'
        });
      }
    });
  }
}

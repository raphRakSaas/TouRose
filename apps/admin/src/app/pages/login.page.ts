import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthSessionService } from '../core/auth-session.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="mx-auto mt-16 max-w-md rounded-2xl bg-white/70 p-6 shadow-sm">
      <h1 class="brand text-3xl">Connexion admin</h1>
      <p class="mt-2 text-sm text-[var(--tourose-color-ink-700)]">
        Auth Supabase réelle. La sécurité d’écriture repose sur RLS (<code>is_admin()</code>), pas
        seulement sur ce formulaire.
      </p>
      <p
        class="mt-2 rounded-md bg-[var(--tourose-color-sand-100)] px-3 py-2 text-xs text-[var(--tourose-color-ink-700)]"
      >
        Local seed : <strong>admin&#64;tourose.local</strong> / <strong>tourose-admin-local</strong>
      </p>
      <form class="mt-6 grid gap-3" [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <label class="grid gap-1 text-sm">
          E-mail
          <input
            class="rounded-md border border-black/10 px-3 py-2"
            type="email"
            formControlName="email"
            autocomplete="username"
          />
        </label>
        <label class="grid gap-1 text-sm">
          Mot de passe
          <input
            class="rounded-md border border-black/10 px-3 py-2"
            type="password"
            formControlName="password"
            autocomplete="current-password"
          />
        </label>
        @if (errorMessage) {
          <p class="text-sm text-[var(--tourose-color-danger)]">{{ errorMessage }}</p>
        }
        <button
          class="rounded-md bg-[var(--tourose-color-brick-500)] px-4 py-2 text-white disabled:opacity-50"
          type="submit"
          [disabled]="loginForm.invalid || isSubmitting"
        >
          {{ isSubmitting ? 'Connexion…' : 'Se connecter' }}
        </button>
      </form>
    </section>
  `,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  errorMessage: string | null = null;
  isSubmitting = false;

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['admin@tourose.local', [Validators.required, Validators.email]],
    password: ['tourose-admin-local', [Validators.required, Validators.minLength(8)]],
  });

  async onSubmit(): Promise<void> {
    this.isSubmitting = true;
    this.errorMessage = null;
    const { email, password } = this.loginForm.getRawValue();
    const result = await this.authSession.signInWithPassword(email, password);
    this.isSubmitting = false;

    if (result.errorMessage) {
      this.errorMessage = result.errorMessage;
      return;
    }

    await this.router.navigateByUrl('/dashboard');
  }
}

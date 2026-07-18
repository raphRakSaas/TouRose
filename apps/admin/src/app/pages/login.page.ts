import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthSessionService } from '../core/auth-session.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="mx-auto mt-16 max-w-md rounded-2xl bg-white/70 p-6 shadow-sm">
      <h1 class="brand text-3xl">Connexion</h1>
      <p class="mt-2 text-sm text-[var(--tourose-color-ink-700)]">
        Placeholder UX. La sécurité réelle repose sur Supabase Auth + RLS, jamais sur ce garde
        client seul.
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
        <button
          class="rounded-md bg-[var(--tourose-color-brick-500)] px-4 py-2 text-white"
          type="submit"
          [disabled]="loginForm.invalid"
        >
          Continuer (démo locale)
        </button>
      </form>
    </section>
  `,
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authSession = inject(AuthSessionService);
  private readonly router = inject(Router);

  readonly loginForm = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  onSubmit(): void {
    const email = this.loginForm.controls.email.value;
    this.authSession.markLocalDemoSession(email);
    void this.router.navigateByUrl('/dashboard');
  }
}

import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly demoEmail = signal<string | null>(this.readStoredEmail());

  hasLocalDemoSession(): boolean {
    return this.demoEmail() !== null;
  }

  markLocalDemoSession(email: string): void {
    this.demoEmail.set(email);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('tourose.admin.demoEmail', email);
    }
  }

  clearLocalDemoSession(): void {
    this.demoEmail.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('tourose.admin.demoEmail');
    }
  }

  private readStoredEmail(): string | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem('tourose.admin.demoEmail');
  }
}

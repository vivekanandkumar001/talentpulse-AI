'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiFetch, apiJson, persistSession } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Upload,
  FileText,
  X,
  CheckCircle,
  ShieldCheck,
  Zap,
  Loader2,
  GraduationCap,
  BookOpen,
  Calendar,
  Building2,
  Briefcase,
  Users,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  RegisterValidationSchema,
  RegisterFormData,
  RecruiterRegisterSchema,
  RecruiterFormData,
  getCourseYears,
  EXPERIENCE_STATUS_OPTIONS,
  isAcademicYearValue,
  withCrossFieldChecks,
} from '@/lib/validations/register';
import {
  PHONE_COUNTRIES,
  DEFAULT_PHONE_COUNTRY,
  getPhoneCountry,
  normalizeNationalNumber,
  toBackendPhone,
} from '@/lib/validations/phone';
import { savePendingResume } from '@/lib/pending-resume';
import { Navbar } from '@/components/Navbar';
import { useCandidateProfileData } from '@/lib/hooks/useCandidateProfileData';
import { AuthCard, buttonClass, inputClass } from '@/components/ui';

/* ------------------------------------------------------------------ helpers */

const sanitizeName = (val: string) =>
  val.replace(/^\s+/, '').replace(/\s+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
const sanitizeEmail = (val: string) => val.replace(/\s/g, '').toLowerCase();
const sanitizePhone = (val: string, maxLength?: number) => {
  const digits = normalizeNationalNumber(val);
  return typeof maxLength === 'number' ? digits.slice(0, maxLength) : digits;
};

const getPasswordStrength = (pass: string) => {
  if (!pass) return null;

  let score = 0;
  if (pass.length >= 8) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass) && /[0-9]/.test(pass)) score += 1;
  if (pass.length >= 10 && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) score += 1;

  // Anything short of a real 8-character password is weak, even if it happens
  // to contain a symbol. The old version could label a 4-character password
  // "Strong" because no check matched.
  if (pass.length < 8 || score <= 1) {
    return { score: 1, label: 'Weak', color: 'bg-red-500' };
  }
  if (score === 2) return { score: 2, label: 'Medium', color: 'bg-yellow-500' };
  return { score: 3, label: 'Strong', color: 'bg-[#10b981]' };
};

const getInputClasses = (hasError: boolean, isRecruiter: boolean = false) =>
  inputClass(hasError, isRecruiter ? 'indigo' : 'cyan');

/* -------------------------------------------------------- shared components */

interface FormLabelProps {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  htmlFor?: string;
  hint?: string;
}

export const FormLabel = ({ label, required = true, icon, htmlFor, hint }: FormLabelProps) => (
  <label
    htmlFor={htmlFor}
    className="inline-flex flex-wrap items-center gap-1.5 text-sm font-medium text-ink mb-1.5"
  >
    {icon && <span className="text-accent-cyan shrink-0">{icon}</span>}
    <span>{label}</span>
    {required && <span className="text-accent-rose font-bold" aria-hidden="true">*</span>}
    {hint && <span className="text-[11px] font-normal text-ink-muted">({hint})</span>}
  </label>
);

interface FormFieldProps {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  error?: string;
  isSubmitted?: boolean;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}

const FormField = ({ label, required = true, icon, error, isSubmitted, htmlFor, hint, children }: FormFieldProps) => (
  <div>
    <FormLabel label={label} required={required} icon={icon} htmlFor={htmlFor} hint={hint} />
    {children}
    {isSubmitted && error && (
      <p id={htmlFor ? `${htmlFor}-error` : undefined} role="alert" className="text-xs text-accent-rose mt-0.5 block leading-tight animate-fadeIn">
        {error}
      </p>
    )}
  </div>
);

interface PhoneFieldProps {
  value: string;
  onChange: (value: string) => void;
  country: string;
  onCountryChange: (iso: string) => void;
  error?: string;
  isSubmitted?: boolean;
  isRecruiter?: boolean;
}

const PhoneField = ({
  value,
  onChange,
  country,
  onCountryChange,
  error,
  isSubmitted,
  isRecruiter = false,
}: PhoneFieldProps) => {
  const selected = getPhoneCountry(country);
  const accent = isRecruiter ? 'text-accent-indigo' : 'text-accent-cyan';
  const inputId = isRecruiter ? 'recruiter-phone' : 'candidate-phone';
  const hasError = Boolean(isSubmitted && error);

  return (
    <FormField
      label="Mobile Number"
      required
      error={error}
      isSubmitted={isSubmitted}
      htmlFor={inputId}
      hint={`${selected.name} · ${selected.nationalLength ?? '6-15'} digits`}
    >
      <div className="flex items-stretch">
        <div className="relative shrink-0">
          <select
            aria-label="Country calling code"
            value={selected.iso}
            onChange={(e) => onCountryChange(e.target.value)}
            className={`h-full appearance-none rounded-l-lg border border-r-0 border-line bg-surface py-2.5 pl-2.5 pr-6 text-xs font-mono font-semibold text-ink cursor-pointer focus:outline-none ${isRecruiter ? 'focus:border-accent-indigo' : 'focus:border-accent-cyan'}`}
          >
            {PHONE_COUNTRIES.map((option) => (
              <option key={option.iso} value={option.iso} title={option.name}>
                {option.flag} {option.dial}
              </option>
            ))}
          </select>
          <ChevronDown
            aria-hidden="true"
            className={`pointer-events-none absolute right-1.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${accent}`}
          />
        </div>
        <div className="relative min-w-0 flex-1">
          <input
            id={inputId}
            name="phone"
            value={value}
            onChange={(e) =>
              onChange(sanitizePhone(e.target.value, selected.nationalLength ?? 15))
            }
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            maxLength={selected.nationalLength ?? 15}
            placeholder={selected.example}
            aria-invalid={hasError}
            aria-describedby={hasError && error ? `${inputId}-error` : undefined}
            className={`${getInputClasses(hasError, isRecruiter)} rounded-l-none rounded-r-lg`}
          />
        </div>
      </div>
    </FormField>
  );
};

interface PasswordFieldProps {
  label: string;
  placeholder?: string;
  error?: string;
  isSubmitted?: boolean;
  isRecruiter?: boolean;
  showPassword: boolean;
  onToggleShow: () => void;
  registration: any;
  passwordValue?: string;
  confirmPasswordValue?: string;
  isConfirm?: boolean;
  fieldId: string;
}

const PasswordField = ({
  label,
  placeholder = 'Please enter your password',
  error,
  isSubmitted,
  isRecruiter = false,
  showPassword,
  onToggleShow,
  registration,
  passwordValue = '',
  confirmPasswordValue = '',
  isConfirm = false,
  fieldId,
}: PasswordFieldProps) => {
  const hasError = Boolean(isSubmitted && error);
  const strength = !isConfirm && passwordValue ? getPasswordStrength(passwordValue) : null;
  const passwordsMatch = isConfirm && confirmPasswordValue.length > 0 && passwordValue === confirmPasswordValue;
  const passwordsMismatch = isConfirm && confirmPasswordValue.length > 0 && passwordValue !== confirmPasswordValue;

  return (
    <FormField label={label} required error={error} isSubmitted={isSubmitted} htmlFor={fieldId}>
      <div className="relative">
        <input
          {...registration}
          id={fieldId}
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          autoComplete="new-password"
          autoCapitalize="none"
          spellCheck={false}
          aria-invalid={hasError}
          aria-describedby={hasError && error ? `${fieldId}-error` : undefined}
          className={`${getInputClasses(hasError, isRecruiter)} pr-10`}
        />
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleShow();
          }}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none cursor-pointer"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4 pointer-events-none" aria-hidden="true" />
          ) : (
            <Eye className="w-4 h-4 pointer-events-none" aria-hidden="true" />
          )}
        </button>
      </div>

      {strength && (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex space-x-1.5 h-1 flex-1">
            <div className={`h-full flex-1 rounded ${strength.score >= 1 ? strength.color : 'bg-surface-2'}`} />
            <div className={`h-full flex-1 rounded ${strength.score >= 2 ? strength.color : 'bg-surface-2'}`} />
            <div className={`h-full flex-1 rounded ${strength.score >= 3 ? strength.color : 'bg-surface-2'}`} />
          </div>
          <span className="text-[10px] font-mono text-ink-muted shrink-0">
            Strength: <span className="font-semibold text-ink">{strength.label}</span>
          </span>
        </div>
      )}

      {passwordsMatch && (
        <div className="mt-1 flex items-center space-x-1 text-xs text-accent-emerald font-mono">
          <Check className="w-3.5 h-3.5 text-accent-emerald" />
          <span>Passwords match</span>
        </div>
      )}
      {passwordsMismatch && (
        <div className="mt-1 flex items-center space-x-1 text-xs text-accent-rose font-mono">
          <X className="w-3.5 h-3.5 text-accent-rose" />
          <span>Passwords do not match</span>
        </div>
      )}
    </FormField>
  );
};

interface PasswordPairProps {
  errors: any;
  isSubmitted: boolean;
  register: any;
  passwordValue: string;
  confirmPasswordValue: string;
  showPass: boolean;
  setShowPass: React.Dispatch<React.SetStateAction<boolean>>;
  showConfirmPass: boolean;
  setShowConfirmPass: React.Dispatch<React.SetStateAction<boolean>>;
  isRecruiter?: boolean;
  idPrefix: string;
}

const PasswordGroup = ({
  errors,
  isSubmitted,
  register,
  passwordValue,
  confirmPasswordValue,
  showPass,
  setShowPass,
  showConfirmPass,
  setShowConfirmPass,
  isRecruiter = false,
  idPrefix,
}: PasswordPairProps) => (
  <>
    <PasswordField
      label="Password"
      placeholder="Please enter your password"
      error={errors.password?.message}
      isSubmitted={isSubmitted}
      showPassword={showPass}
      onToggleShow={() => setShowPass((prev) => !prev)}
      registration={register('password')}
      passwordValue={passwordValue}
      isRecruiter={isRecruiter}
      fieldId={`${idPrefix}-password`}
    />
    <PasswordField
      label="Confirm Password"
      placeholder="Please confirm your password"
      error={errors.confirmPassword?.message}
      isSubmitted={isSubmitted}
      showPassword={showConfirmPass}
      onToggleShow={() => setShowConfirmPass((prev) => !prev)}
      registration={register('confirmPassword')}
      passwordValue={passwordValue}
      confirmPasswordValue={confirmPasswordValue}
      isConfirm
      isRecruiter={isRecruiter}
      fieldId={`${idPrefix}-confirm-password`}
    />
  </>
);

interface FormStepHeaderProps {
  title: string;
  roleLabel: string;
  icon: React.ElementType;
  onBack: () => void;
  isRecruiter?: boolean;
}

const FormStepHeader = ({ title, roleLabel, icon: Icon, onBack, isRecruiter = false }: FormStepHeaderProps) => {
  const accent = isRecruiter ? 'text-accent-indigo' : 'text-accent-cyan';
  const badgeClass = isRecruiter
    ? 'bg-indigo-500/10 border-indigo-500/20 text-accent-indigo'
    : 'bg-cyan-500/10 border-cyan-500/20 text-accent-cyan';
  return (
    <div className="space-y-2 pb-2 border-b border-line">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center space-x-1 text-xs ${accent} font-semibold cursor-pointer transition-colors`}
        >          <span>Change Account Type</span>
        </button>
        <span className={`px-2.5 py-1 rounded-full border text-[11px] font-mono font-semibold flex items-center space-x-1 ${badgeClass}`}>
          <Icon className="w-3 h-3 mr-1" />
          {roleLabel}
        </span>
      </div>
      <h2 className="text-lg font-bold text-ink">{title}</h2>
    </div>
  );
};

interface SubmitSectionProps {
  register: any;
  error?: string;
  isSubmitted: boolean;
  termsText: React.ReactNode;
  isSubmitting: boolean;
  loadingText: string;
  submitText: string;
  isRecruiter?: boolean;
  idPrefix: string;
}

const SubmitSection = ({
  register,
  error,
  isSubmitted,
  termsText,
  isSubmitting,
  loadingText,
  submitText,
  isRecruiter = false,
  idPrefix,
}: SubmitSectionProps) => (
  <div className="md:col-span-2 space-y-3 pt-2">
    <label htmlFor={`${idPrefix}-terms`} className="flex items-start space-x-2 cursor-pointer">
      <input
        {...register('agreeTerms')}
        id={`${idPrefix}-terms`}
        type="checkbox"
        aria-invalid={Boolean(isSubmitted && error)}
        aria-describedby={isSubmitted && error ? `${idPrefix}-terms-error` : undefined}
        className={`mt-1 rounded bg-inset border-line ${isRecruiter ? 'text-indigo-500' : 'text-accent-cyan'} focus:ring-0`}
      />
      <span className="text-xs text-ink-muted leading-normal font-normal">
        {termsText} <span className="text-accent-rose font-bold ml-0.5">*</span>
      </span>
    </label>
    {isSubmitted && error && (
      <p id={`${idPrefix}-terms-error`} role="alert" className="text-xs text-accent-rose mt-0.5 block animate-fadeIn">
        {error}
      </p>
    )}

    <button
      type="submit"
      disabled={isSubmitting}
      className={buttonClass('primary', 'lg', 'pill', 'w-full disabled:cursor-not-allowed disabled:opacity-60')}
    >
      {isSubmitting ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-ink" />
          <span>{loadingText}</span>
        </>
      ) : (
        <span>{submitText}</span>
      )}
    </button>
  </div>
);

/* ------------------------------------------------------------- main component */

const COURSE_OPTIONS = ['B.Tech', 'M.Tech', 'BCA', 'MCA', 'B.Sc CS', 'Other'];
const BRANCH_OPTIONS = [
  'Computer Science & Engineering',
  'Artificial Intelligence & ML',
  'Data Science',
  'Information Technology',
  'ECE',
  'Other',
];
const TEAM_SIZE_OPTIONS = [
  '1-10 Employees',
  '11-50 Employees',
  '51-200 Employees',
  '201-1000 Employees',
  '1000+ Employees',
];

const TRUST_BADGES = [
  {
    icon: CheckCircle,
    color: 'text-accent-emerald',
    title: 'Objective & Fair Skill Evaluation',
    desc: 'Every applicant is evaluated strictly on merit and core skills.',
  },
  {
    icon: ShieldCheck,
    color: 'text-accent-cyan',
    title: 'Safe & Encrypted Video Sessions',
    desc: 'SSL / TLS encryption ensures your video recordings and data remain private.',
  },
  {
    icon: Zap,
    color: 'text-accent-indigo',
    title: 'Instant Candidate Scorecard Delivery',
    desc: 'Get verifiable evaluation dossiers and performance reports within seconds.',
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<'candidate' | 'recruiter' | null>(null);

  // Password toggles & file states
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const [parsedSkills, setParsedSkills] = useState<string[]>([]);
  const [resumeError, setResumeError] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalErrorMsg, setGlobalErrorMsg] = useState<string>('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    // Option 1: If user is already logged in, redirect directly to their dashboard.
    // Verify the session server-side — stale localStorage alone must not trigger a redirect.
    void (async () => {
      try {
        const me = await apiJson<{ role?: string; user?: { role?: string } } | null>('/api/auth/me', {}, { skipCache: true });
        const role = String(me?.user?.role || me?.role || '').toLowerCase().trim();
        if (me && role) {
          const target = role === 'super_admin'
            ? '/super-admin'
            : (role === 'recruiter' || role === 'admin' || role === 'hr' || role === 'employer')
              ? '/recruiter/dashboard'
              : '/candidate/dashboard';
          router.replace(target);
        }
      } catch { /* stay on register page */ }
    })();

    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.has('password') ||
      urlParams.has('email') ||
      urlParams.has('pass') ||
      urlParams.has('pwd')
    ) {
      urlParams.delete('password');
      urlParams.delete('email');
      urlParams.delete('pass');
      urlParams.delete('pwd');
      const cleanSearch = urlParams.toString();
      const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
      window.history.replaceState(null, '', cleanUrl);
    }
  }, []);

  // Auto-fill profile data from existing candidate profile (disabled for unauthenticated registration)
  const {
    profile,
    loading: profileLoading,
    loadError,
  } = useCandidateProfileData({
    onToast: (_text: string, _type: 'success' | 'error') => {},
    enabled: false,
  });

  // Forms
  const candidateForm = useForm<RegisterFormData>({
    resolver: withCrossFieldChecks(zodResolver(RegisterValidationSchema)),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    // focusFirstError() below handles focus; RHF's own focus only knows about
    // fields wired through register(), so it would jump to the password input
    // and override the first (name/email) field.
    shouldFocusError: false,
    defaultValues: {
      fullName: profile?.fullName || '',
      course: profile?.course || 'B.Tech',
      branch: profile?.branch || 'Computer Science & Engineering',
      year: profile?.academicYear || '1st Year',
      email: profile?.email || '',
      phone: profile?.phone || '',
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  const recruiterForm = useForm<RecruiterFormData>({
    resolver: withCrossFieldChecks(zodResolver(RecruiterRegisterSchema)),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: false,
    defaultValues: {
      fullName: profile?.fullName || '',
      workEmail: profile?.email || '',
      companyName: profile?.collegeName || '',
      designation: '',
      teamSize: '11-50 Employees',
      phone: profile?.phone || '',
      phoneCountry: DEFAULT_PHONE_COUNTRY,
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
  });

  const candVals = candidateForm.watch();
  const recVals = recruiterForm.watch();

  const candidateCourse = candVals.course || 'B.Tech';
  const availableYears = getCourseYears(candidateCourse);
  const selectedEducationStatus = candVals.year || '';

  // Focuses the first field that fails validation so the user is never left
  // staring at a dead submit button with an error off-screen.
  const focusFirstError = (errors: Record<string, unknown>) => {
    const order = [
      'fullName',
      'email',
      'workEmail',
      'companyName',
      'designation',
      'course',
      'branch',
      'year',
      'teamSize',
      'phone',
      'password',
      'confirmPassword',
      'resume',
      'agreeTerms',
    ];
    const firstKey = order.find((key) => Boolean(errors[key])) ?? Object.keys(errors)[0];
    if (!firstKey) return;

    const idByField: Record<string, string> = {
      fullName: 'candidate-full-name',
      email: 'candidate-email',
      workEmail: 'recruiter-work-email',
      companyName: 'recruiter-company',
      designation: 'recruiter-designation',
      course: 'candidate-course',
      branch: 'candidate-branch',
      year: 'candidate-education-status',
      teamSize: 'recruiter-team-size',
      phone: selectedRole === 'recruiter' ? 'recruiter-phone' : 'candidate-phone',
      password: selectedRole === 'recruiter' ? 'recruiter-password' : 'candidate-password',
      confirmPassword:
        selectedRole === 'recruiter'
          ? 'recruiter-confirm-password'
          : 'candidate-confirm-password',
      resume: 'candidate-resume',
      agreeTerms:
        selectedRole === 'recruiter' ? 'recruiter-terms' : 'candidate-terms',
    };
    const element = document.getElementById(idByField[firstKey] ?? firstKey);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    (element as HTMLElement | null)?.focus({ preventScroll: true });
  };

  // File handlers
  const parseSelectedResume = async (file: File) => {
    setResumeError('');

    if (!/\.(pdf|docx)$/i.test(file.name)) {
      setResumeError('Only PDF and DOCX resumes are supported.');
      return;
    }
    if (file.size === 0) {
      setResumeError('That resume file is empty. Please choose another file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResumeError('Resume must be 5MB or smaller.');
      return;
    }

    setSelectedFile(file);
    // Revalidate like the other fields, otherwise a previously shown
    // "Please upload your resume" error stays on screen after the fix.
    candidateForm.setValue('resume', file, { shouldValidate: candidateForm.formState.isSubmitted });
    setIsParsingResume(true);
    setParsedSkills([]);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiFetch('/api/candidate/resume-parse', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.extractedSkills && Array.isArray(data.extractedSkills)) {
          setParsedSkills(data.extractedSkills);
        }
      }
    } catch (err) {
      console.warn('[Resume Parse] Preview parse notice:', err);
    } finally {
      setIsParsingResume(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.[0]) {
      void parseSelectedResume(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      void parseSelectedResume(e.target.files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setParsedSkills([]);
    setResumeError('');
    candidateForm.setValue('resume', undefined as any, { shouldValidate: candidateForm.formState.isSubmitted });
    const input = document.getElementById('candidate-resume') as HTMLInputElement | null;
    if (input) input.value = '';
  };

  // Submit Helper
  const handleAuthSubmit = async (payload: Record<string, unknown>, successPath: string, resumeFile?: File | null) => {
    setIsSubmitting(true);
    setGlobalErrorMsg('');
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const contentType = res.headers.get('content-type') || '';
      const result = contentType.includes('application/json') ? await res.json() : null;

      if (res.status === 409 || result?.isDuplicate) {
        setGlobalErrorMsg('An account with this email address already exists. Redirecting to login...');
        setTimeout(() => router.push('/login'), 1500);
        return;
      }

      if (!res.ok) {
        const errorDetail =
          result?.detail ||
          result?.message ||
          result?.error ||
          'Registration failed. Please check the entered details.';
        throw new Error(typeof errorDetail === 'string' ? errorDetail : 'Registration failed.');
      }

      const otpUrl = typeof result?.redirectUrl === 'string' ? result.redirectUrl : null;
      if (otpUrl) {
        // The resume endpoint requires an authenticated session, which only
        // exists after OTP verification. Keep the File in IndexedDB and attach
        // it on the verify-otp page once the account is confirmed.
        if (resumeFile && payload.email) {
          try {
            await savePendingResume(String(payload.email), resumeFile);
          } catch (storageErr) {
            console.warn('[Register] Could not stash the resume for later upload:', storageErr);
          }
        }

        if (typeof window !== 'undefined') {
          window.location.assign(otpUrl);
        } else {
          router.push(otpUrl);
        }
        return;
      }

      if (result?.access_token) {
        persistSession(result.access_token, result.refresh_token, result.user || {});

        if (resumeFile) {
          try {
            const rData = new FormData();
            rData.append('file', resumeFile);
            await apiFetch('/api/candidate/resume', { method: 'POST', body: rData });
          } catch (uploadErr) {
            console.warn('[Register] Resume sync notice:', uploadErr);
          }
        }
      }

      router.push(successPath);
    } catch (err: any) {
      setGlobalErrorMsg(err?.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmitCandidate = (data: RegisterFormData) => {
    const isStudent = isAcademicYearValue(data.course, data.year);
    const yearsExperience = data.year === 'Fresher (0 years)'
      ? 0
      : data.year === '1-2 Years Experience'
        ? 1
        : data.year === '2+ Years Experience'
          ? 2
          : null;

    return handleAuthSubmit(
      {
        full_name: data.fullName,
        fullName: data.fullName,
        email: data.email.trim().toLowerCase(),
        password: data.password,
        role: 'candidate',
        phone: toBackendPhone(data.phoneCountry, data.phone) || null,
        phone_country: data.phoneCountry,
        course: data.course || null,
        branch: data.branch || null,
        academic_year: isStudent ? data.year : null,
        education_status: data.year || null,
        years_experience: yearsExperience,
        year: data.year || null,
        headline: `${data.course || 'B.Tech'} • ${data.branch || 'Engineering'} (${data.year || 'Student'})`,
      },
      '/candidate/dashboard',
      selectedFile
    );
  };

  const onSubmitRecruiter = (data: RecruiterFormData) =>
    handleAuthSubmit(
      {
        full_name: data.fullName,
        fullName: data.fullName,
        email: data.workEmail.trim().toLowerCase(),
        password: data.password,
        role: 'recruiter',
        org_name: data.companyName,
        companyName: data.companyName,
        company_name: data.companyName,
        designation: data.designation,
        teamSize: data.teamSize,
        company_size: data.teamSize,
        phone: toBackendPhone(data.phoneCountry, data.phone) || null,
        phone_country: data.phoneCountry,
        headline: `${data.designation || 'Recruiter'} at ${data.companyName}`,
      },
      '/recruiter/dashboard'
    );

  return (
    <div className="h-dvh bg-canvas text-ink font-sans flex flex-col relative overflow-y-auto overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-full ambient-glow-cyan pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-full h-full ambient-glow-indigo pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Naukri-style Unified Header Bar */}
        <Navbar />

        {/* Main Content */}
        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="min-h-full w-full max-w-7xl mx-auto px-6 py-10 flex items-center justify-center">
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 w-full items-center">

            {/* SECTION A: FORM CONTAINER */}
            <motion.div
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full mx-auto max-w-3xl order-1 lg:order-2 lg:col-span-7"
            >
              <AuthCard innerClassName="space-y-6">
                {globalErrorMsg && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-accent-amber text-xs font-medium flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-accent-amber shrink-0" />
                    <span>{globalErrorMsg}</span>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {/* STEP 1: ROLE SELECTION */}
                  {selectedRole === null ? (
                    <motion.div
                      key="step-1-role-selection"
                      initial={{ opacity: 1, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-6"
                    >
                      <div>
                        <h2 className="text-2xl font-bold text-ink tracking-tight">Choose Your Account Type</h2>
                        <p className="text-sm text-ink-muted mt-1">Select how you intend to use Progeni Atlas.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                          onClick={() => { setSelectedRole('candidate'); setShowPass(false); setShowConfirmPass(false); }}
                          className="p-6 rounded-2xl bg-surface border border-line hover:border-cyan-400/80 hover:bg-surface cursor-pointer transition-all duration-200 group flex flex-col justify-between"
                        >
                          <div>
                            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 flex items-center justify-center text-accent-cyan mb-4 group-hover:scale-105 transition-transform">
                              <GraduationCap className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-ink">Candidate / Student</h3>
                            <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                              Take real-time AI video interviews, practice technical rounds, and receive detailed skill scorecards.
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-cyan mt-5 group-hover:translate-x-1 transition-transform">
                            Continue as Candidate 
                          </span>
                        </div>

                        <div
                          onClick={() => { setSelectedRole('recruiter'); setShowPass(false); setShowConfirmPass(false); }}
                          className="p-6 rounded-2xl bg-surface border border-line hover:border-indigo-400/80 hover:bg-surface cursor-pointer transition-all duration-200 group flex flex-col justify-between"
                        >
                          <div>
                            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-accent-indigo mb-4 group-hover:scale-105 transition-transform">
                              <Building2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-lg font-bold text-ink">Recruiter / Enterprise</h3>
                            <p className="text-xs text-ink-muted mt-1.5 leading-relaxed">
                              Automate technical candidate screenings, customize interview rubrics, and access verified audit dossiers.
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-indigo mt-5 group-hover:translate-x-1 transition-transform">
                            Continue as Recruiter 
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ) : selectedRole === 'candidate' ? (

                    /* STEP 2A: CANDIDATE FORM */
                    <motion.div
                      key="step-2-candidate-form"
                      initial={{ opacity: 1, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <FormStepHeader
                        title="Candidate & Student Registration"
                        roleLabel="Candidate Form"
                        icon={GraduationCap}
                        onBack={() => setSelectedRole(null)}
                      />

                      <form
                        action="#"
                        method="POST"
                        onSubmit={candidateForm.handleSubmit(onSubmitCandidate, (errors) => focusFirstError(errors as Record<string, unknown>))}
                        className="space-y-4"
                        noValidate
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Full Name */}
                          <FormField
                            label="Full Name"
                            error={candidateForm.formState.errors.fullName?.message}
                            isSubmitted={candidateForm.formState.isSubmitted}
                            htmlFor="candidate-full-name"
                          >
                            <input
                              id="candidate-full-name"
                              name="fullName"
                              value={candVals.fullName || ''}
                              onChange={(e) => candidateForm.setValue('fullName', sanitizeName(e.target.value), { shouldValidate: candidateForm.formState.isSubmitted })}
                              type="text"
                              autoComplete="name"
                              autoCapitalize="words"
                              placeholder="Please enter your full name"
                              aria-invalid={Boolean(candidateForm.formState.isSubmitted && candidateForm.formState.errors.fullName)}
                              aria-describedby={candidateForm.formState.isSubmitted && candidateForm.formState.errors.fullName ? 'candidate-full-name-error' : undefined}
                              className={getInputClasses(Boolean(candidateForm.formState.isSubmitted && candidateForm.formState.errors.fullName))}
                            />
                          </FormField>

                          {/* Email */}
                          <FormField
                            label="Email Address"
                            error={candidateForm.formState.errors.email?.message}
                            isSubmitted={candidateForm.formState.isSubmitted}
                            htmlFor="candidate-email"
                          >
                            <input
                              id="candidate-email"
                              name="email"
                              value={candVals.email || ''}
                              onChange={(e) => candidateForm.setValue('email', sanitizeEmail(e.target.value), { shouldValidate: candidateForm.formState.isSubmitted })}
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              autoCapitalize="none"
                              spellCheck={false}
                              placeholder="Please enter your email address"
                              aria-invalid={Boolean(candidateForm.formState.isSubmitted && candidateForm.formState.errors.email)}
                              aria-describedby={candidateForm.formState.isSubmitted && candidateForm.formState.errors.email ? 'candidate-email-error' : undefined}
                              className={getInputClasses(Boolean(candidateForm.formState.isSubmitted && candidateForm.formState.errors.email))}
                            />
                          </FormField>

                          {/* Course */}
                          <FormField
                            label="Course"
                            icon={<GraduationCap className="w-4 h-4 text-accent-cyan" />}
                            error={candidateForm.formState.errors.course?.message}
                            isSubmitted={candidateForm.formState.isSubmitted}
                            htmlFor="candidate-course"
                          >
                            <select
                              id="candidate-course"
                              name="course"
                              value={candidateCourse}
                              onChange={(e) => {
                                const newCourse = e.target.value;
                                candidateForm.setValue('course', newCourse, { shouldValidate: candidateForm.formState.isSubmitted });
                                const newYears = getCourseYears(newCourse);
                                // Only reset when the current value is a study year
                                // that no longer exists in the newly selected course.
                                if (isAcademicYearValue(candidateCourse, selectedEducationStatus) && !newYears.includes(selectedEducationStatus)) {
                                  candidateForm.setValue('year', newYears[0], { shouldValidate: candidateForm.formState.isSubmitted });
                                }
                              }}
                              className={getInputClasses(Boolean(candidateForm.formState.isSubmitted && candidateForm.formState.errors.course))}
                            >
                              {COURSE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </FormField>

                          {/* Branch */}
                          <FormField
                            label="Branch / Specialization"
                            icon={<BookOpen className="w-4 h-4 text-accent-emerald" />}
                            error={candidateForm.formState.errors.branch?.message}
                            isSubmitted={candidateForm.formState.isSubmitted}
                            htmlFor="candidate-branch"
                          >
                            <select
                              id="candidate-branch"
                              name="branch"
                              value={candVals.branch}
                              onChange={(e) => candidateForm.setValue('branch', e.target.value, { shouldValidate: candidateForm.formState.isSubmitted })}
                              className={getInputClasses(Boolean(candidateForm.formState.isSubmitted && candidateForm.formState.errors.branch))}
                            >
                              {BRANCH_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </FormField>

                          {/* Education / Experience status */}
                          <FormField
                            label="Education / Experience"
                            icon={<Calendar className="w-4 h-4 text-accent-cyan" />}
                            error={candidateForm.formState.errors.year?.message}
                            isSubmitted={candidateForm.formState.isSubmitted}
                            htmlFor="candidate-education-status"
                          >
                            <select
                              id="candidate-education-status"
                              name="year"
                              value={selectedEducationStatus || availableYears[0]}
                              onChange={(e) => candidateForm.setValue('year', e.target.value, { shouldValidate: candidateForm.formState.isSubmitted })}
                              className={getInputClasses(Boolean(candidateForm.formState.isSubmitted && candidateForm.formState.errors.year))}
                            >
                              <optgroup label="Currently studying">
                                {availableYears.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </optgroup>
                              <optgroup label="Graduated / Experience">
                                {EXPERIENCE_STATUS_OPTIONS.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </optgroup>
                            </select>
                          </FormField>

                          {/* Phone */}
                          <PhoneField
                            value={candVals.phone || ''}
                            onChange={(value) => candidateForm.setValue('phone', value, { shouldValidate: candidateForm.formState.isSubmitted })}
                            country={candVals.phoneCountry || DEFAULT_PHONE_COUNTRY}
                            onCountryChange={(iso) => {
                              const nextCountry = getPhoneCountry(iso);
                              candidateForm.setValue('phoneCountry', iso);
                              candidateForm.setValue(
                                'phone',
                                sanitizePhone(candVals.phone || '', nextCountry.nationalLength ?? 15),
                                { shouldValidate: candidateForm.formState.isSubmitted }
                              );
                            }}
                            error={candidateForm.formState.errors.phone?.message}
                            isSubmitted={candidateForm.formState.isSubmitted}
                          />

                          {/* Password & Confirm */}
                          <PasswordGroup
                            errors={candidateForm.formState.errors}
                            isSubmitted={candidateForm.formState.isSubmitted}
                            register={candidateForm.register}
                            passwordValue={candVals.password || ''}
                            confirmPasswordValue={candVals.confirmPassword || ''}
                            showPass={showPass}
                            setShowPass={setShowPass}
                            showConfirmPass={showConfirmPass}
                            setShowConfirmPass={setShowConfirmPass}
                            idPrefix="candidate"
                          />

                          {/* Resume Upload */}
                          <div className="md:col-span-2">
                            <FormLabel
                              label="Upload Resume"
                              hint="PDF / DOCX · max 5MB"
                              htmlFor="candidate-resume"
                              required
                            />
                            {selectedFile ? (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-inset border border-[#38bdf8]/50 text-xs shadow-[0_0_10px_rgba(56,189,248,0.2)]">
                                  <div className="flex items-center space-x-2 truncate">
                                    <FileText className="w-4 h-4 text-accent-cyan shrink-0" />
                                    <span className="text-ink truncate font-medium">{selectedFile.name}</span>
                                    <span className="text-ink-muted text-[10px]">
                                      ({selectedFile.size < 1024 * 1024
                                        ? `${Math.max(0.1, Number((selectedFile.size / 1024).toFixed(1)))} KB`
                                        : `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB`})
                                    </span>
                                    {isParsingResume && (
                                      <span className="inline-flex items-center space-x-1 text-[11px] text-accent-cyan animate-pulse">
                                        <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                                        <span>Parsing skills...</span>
                                      </span>
                                    )}
                                    {!isParsingResume && parsedSkills.length > 0 && (
                                      <span className="inline-flex items-center space-x-1 text-[10px] text-accent-emerald font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                        <Check className="w-3 h-3 text-accent-emerald shrink-0" />
                                        <span>Parsed ({parsedSkills.length} Skills)</span>
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={removeFile}
                                    className="text-ink-muted hover:text-accent-rose p-1 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>

                                {parsedSkills.length > 0 && (
                                  <div className="p-3.5 rounded-xl bg-accent-cyan/10 border border-accent-cyan/30 text-xs animate-fadeIn shadow-xs">
                                    <div className="flex items-center gap-1.5 mb-2.5">
                                      <Check className="w-3.5 h-3.5 text-accent-cyan shrink-0" />
                                      <span className="text-xs font-semibold text-ink">
                                        Identified Skills from Resume ({parsedSkills.length}):
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                      {parsedSkills.map((skill) => (
                                        <span
                                          key={skill}
                                          className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-surface text-ink-2 border border-line shadow-xs hover:border-sky-300 transition-colors"
                                        >
                                          {skill}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <label
                                htmlFor="candidate-resume"
                                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                                onDragLeave={() => setIsDragOver(false)}
                                onDrop={handleFileDrop}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg bg-inset border-2 border-dashed transition-all cursor-pointer text-center ${
                                  (candidateForm.formState.isSubmitted && candidateForm.formState.errors.resume) || resumeError
                                    ? 'border-rose-500/80 bg-rose-950/10'
                                    : isDragOver
                                    ? 'border-cyan-400 bg-cyan-950/30 shadow-[0_0_18px_rgba(34,211,238,0.4)]'
                                    : 'border-line hover:border-[#38bdf8]/60'
                                }`}
                              >
                                <Upload className="w-5 h-5 text-accent-cyan mb-1" />
                                <span className="text-xs text-ink font-medium">Drag & drop or click to upload your resume</span>
                                <span className="text-[10px] text-ink-muted mt-1">
                                  Your resume helps our AI ask relevant questions based on your actual projects and coursework.
                                </span>
                                <input
                                  id="candidate-resume"
                                  name="resume"
                                  type="file"
                                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                  onChange={handleFileChange}
                                  className="sr-only"
                                />
                              </label>
                            )}
                            {resumeError && (
                              <p role="alert" className="text-xs text-accent-rose mt-1 block font-semibold animate-fadeIn">
                                {resumeError}
                              </p>
                            )}
                            {!resumeError && candidateForm.formState.isSubmitted && candidateForm.formState.errors.resume && (
                              <p role="alert" className="text-xs text-accent-rose mt-1 block font-semibold animate-fadeIn">
                                {candidateForm.formState.errors.resume.message as string}
                              </p>
                            )}
                          </div>

                          {/* Terms & Submit */}
                          <SubmitSection
                            register={candidateForm.register}
                            error={candidateForm.formState.errors.agreeTerms?.message}
                            isSubmitted={candidateForm.formState.isSubmitted}
                            termsText={
                              <>
                                I agree to the{' '}
                                <Link href="/terms" target="_blank" className="text-accent-cyan hover:underline">Candidate Terms of Service</Link>
                                {' '}and{' '}
                                <Link href="/privacy" target="_blank" className="text-accent-cyan hover:underline">Privacy Policy</Link>.
                              </>
                            }
                            isSubmitting={isSubmitting}
                            loadingText="Creating profile..."
                            submitText="Complete Registration & Launch Interview "
                            idPrefix="candidate"
                          />
                        </div>
                      </form>
                    </motion.div>
                  ) : (

                    /* STEP 2B: RECRUITER FORM */
                    <motion.div
                      key="step-2-recruiter-form"
                      initial={{ opacity: 1, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <FormStepHeader
                        title="Recruiter & Enterprise Registration"
                        roleLabel="Recruiter Form"
                        icon={Building2}
                        onBack={() => setSelectedRole(null)}
                        isRecruiter
                      />

                      <form
                        action="#"
                        method="POST"
                        onSubmit={recruiterForm.handleSubmit(onSubmitRecruiter, (errors) => focusFirstError(errors as Record<string, unknown>))}
                        className="space-y-4"
                        noValidate
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Full Name */}
                          <FormField
                            label="Full Name"
                            error={recruiterForm.formState.errors.fullName?.message}
                            isSubmitted={recruiterForm.formState.isSubmitted}
                            htmlFor="recruiter-full-name"
                          >
                            <input
                              id="recruiter-full-name"
                              name="fullName"
                              value={recVals.fullName || ''}
                              onChange={(e) => recruiterForm.setValue('fullName', sanitizeName(e.target.value), { shouldValidate: recruiterForm.formState.isSubmitted })}
                              type="text"
                              autoComplete="name"
                              autoCapitalize="words"
                              placeholder="Please enter your full name"
                              aria-invalid={Boolean(recruiterForm.formState.isSubmitted && recruiterForm.formState.errors.fullName)}
                              aria-describedby={recruiterForm.formState.isSubmitted && recruiterForm.formState.errors.fullName ? 'recruiter-full-name-error' : undefined}
                              className={getInputClasses(Boolean(recruiterForm.formState.isSubmitted && recruiterForm.formState.errors.fullName), true)}
                            />
                          </FormField>

                          {/* Work Email */}
                          <FormField
                            label="Work Email Address"
                            error={recruiterForm.formState.errors.workEmail?.message}
                            isSubmitted={recruiterForm.formState.isSubmitted}
                            htmlFor="recruiter-work-email"
                          >
                            <input
                              id="recruiter-work-email"
                              name="workEmail"
                              value={recVals.workEmail || ''}
                              onChange={(e) => recruiterForm.setValue('workEmail', sanitizeEmail(e.target.value), { shouldValidate: recruiterForm.formState.isSubmitted })}
                              type="email"
                              inputMode="email"
                              autoComplete="email"
                              autoCapitalize="none"
                              spellCheck={false}
                              placeholder="Please enter your work email address"
                              aria-invalid={Boolean(recruiterForm.formState.isSubmitted && recruiterForm.formState.errors.workEmail)}
                              aria-describedby={recruiterForm.formState.isSubmitted && recruiterForm.formState.errors.workEmail ? 'recruiter-work-email-error' : undefined}
                              className={getInputClasses(Boolean(recruiterForm.formState.isSubmitted && recruiterForm.formState.errors.workEmail), true)}
                            />
                          </FormField>

                          {/* Company Name */}
                          <FormField
                            label="Company / Organization Name"
                            icon={<Building2 className="w-4 h-4 text-accent-indigo" />}
                            error={recruiterForm.formState.errors.companyName?.message}
                            isSubmitted={recruiterForm.formState.isSubmitted}
                            htmlFor="recruiter-company"
                          >
                            <input
                              {...recruiterForm.register('companyName')}
                              id="recruiter-company"
                              type="text"
                              autoComplete="organization"
                              placeholder="Please enter your company name"
                              className={getInputClasses(Boolean(recruiterForm.formState.isSubmitted && recruiterForm.formState.errors.companyName), true)}
                            />
                          </FormField>

                          {/* Designation */}
                          <FormField
                            label="Job Designation"
                            icon={<Briefcase className="w-4 h-4 text-accent-indigo" />}
                            error={recruiterForm.formState.errors.designation?.message}
                            isSubmitted={recruiterForm.formState.isSubmitted}
                            htmlFor="recruiter-designation"
                          >
                            <input
                              {...recruiterForm.register('designation')}
                              id="recruiter-designation"
                              type="text"
                              autoComplete="organization-title"
                              placeholder="Please enter your job title"
                              className={getInputClasses(Boolean(recruiterForm.formState.isSubmitted && recruiterForm.formState.errors.designation), true)}
                            />
                          </FormField>

                          {/* Team Size */}
                          <FormField
                            label="Company Team Size"
                            icon={<Users className="w-4 h-4 text-accent-indigo" />}
                            error={recruiterForm.formState.errors.teamSize?.message}
                            isSubmitted={recruiterForm.formState.isSubmitted}
                            htmlFor="recruiter-team-size"
                          >
                            <select
                              id="recruiter-team-size"
                              name="teamSize"
                              value={recVals.teamSize || '11-50 Employees'}
                              onChange={(e) => recruiterForm.setValue('teamSize', e.target.value, { shouldValidate: recruiterForm.formState.isSubmitted })}
                              className={getInputClasses(Boolean(recruiterForm.formState.isSubmitted && recruiterForm.formState.errors.teamSize), true)}
                            >
                              {TEAM_SIZE_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </FormField>

                          {/* Phone */}
                          <PhoneField
                            value={recVals.phone || ''}
                            onChange={(value) => recruiterForm.setValue('phone', value, { shouldValidate: recruiterForm.formState.isSubmitted })}
                            country={recVals.phoneCountry || DEFAULT_PHONE_COUNTRY}
                            onCountryChange={(iso) => {
                              const nextCountry = getPhoneCountry(iso);
                              recruiterForm.setValue('phoneCountry', iso);
                              recruiterForm.setValue(
                                'phone',
                                sanitizePhone(recVals.phone || '', nextCountry.nationalLength ?? 15),
                                { shouldValidate: recruiterForm.formState.isSubmitted }
                              );
                            }}
                            error={recruiterForm.formState.errors.phone?.message}
                            isSubmitted={recruiterForm.formState.isSubmitted}
                            isRecruiter
                          />

                          {/* Password & Confirm */}
                          <PasswordGroup
                            errors={recruiterForm.formState.errors}
                            isSubmitted={recruiterForm.formState.isSubmitted}
                            register={recruiterForm.register}
                            passwordValue={recVals.password || ''}
                            confirmPasswordValue={recVals.confirmPassword || ''}
                            showPass={showPass}
                            setShowPass={setShowPass}
                            showConfirmPass={showConfirmPass}
                            setShowConfirmPass={setShowConfirmPass}
                            isRecruiter
                            idPrefix="recruiter"
                          />

                          {/* Terms & Submit */}
                          <SubmitSection
                            register={recruiterForm.register}
                            error={recruiterForm.formState.errors.agreeTerms?.message}
                            isSubmitted={recruiterForm.formState.isSubmitted}
                            termsText={
                              <>
                                I agree to the{' '}
                                <Link href="/terms" target="_blank" className="text-accent-cyan hover:underline">Terms of Service</Link>
                                {' '}and{' '}
                                <Link href="/ai-transparency" target="_blank" className="text-accent-cyan hover:underline">AI Transparency &amp; AEDT Notice</Link>.
                              </>
                            }
                            isSubmitting={isSubmitting}
                            loadingText="Setting up enterprise account..."
                            submitText="Complete Registration & Access Dashboard "
                            isRecruiter
                            idPrefix="recruiter"
                          />
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </AuthCard>
            </motion.div>

            {/* SECTION B: VALUE PROPOSITIONS & HERO COPY */}
            <motion.div
              initial={{ opacity: 1, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="hidden lg:block w-full order-2 lg:order-1 lg:col-span-5 space-y-6"
            >
              <div>
                <span className="text-xs font-mono font-bold text-accent-cyan uppercase tracking-wider block">
                  {selectedRole === 'recruiter' ? 'RECRUITER & ENTERPRISE PORTAL' : 'CANDIDATE ONBOARDING'}
                </span>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-tight mt-2">
                  {selectedRole === 'recruiter' ? 'Automate Your Technical Hiring' : 'Start Your AI Technical Interview'}
                </h1>

                <p className="text-sm text-ink-muted leading-relaxed font-normal mt-2">
                  {selectedRole === 'recruiter'
                    ? 'Conduct structured, unbiased first-round technical interviews at scale without scheduling fatigue.'
                    : 'Practice or interview anytime in a comfortable, pressure-free environment with personalized, real-time feedback.'}
                </p>
              </div>

              {/* Dynamic Trust Badges */}
              <div className="space-y-3.5 pt-2">
                {TRUST_BADGES.map((badge) => (
                  <div key={badge.title} className="flex items-start space-x-3 p-3.5 rounded-xl bg-surface border border-line">
                    <badge.icon className={`w-5 h-5 ${badge.color} shrink-0 mt-0.5`} />
                    <div>
                      <h3 className="text-sm font-semibold text-ink">{badge.title}</h3>
                      <p className="text-xs text-ink-muted">{badge.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// =============================================================================
// MTS TELECOM - Register Page (Soft AI SaaS Design)
// Multi-step: Role selection → Form with glassmorphism card
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { RootState, AppDispatch } from '../redux/store';
import { register, googleLogin, clearError } from '../redux/slices/authSlice';
import {
  Mail, Lock, Phone, Building2, Eye, EyeOff, CheckCircle,
  Users, Headphones, BarChart3, Shield, ChevronRight, AlertCircle, ChevronLeft,
} from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

import { UserRole } from '../types';
import AuthLayout from '../components/auth/AuthLayout';
import { isGoogleOAuthEnabled } from '../App';

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  cls: string;
}

const roleOptions: RoleOption[] = [
  { value: UserRole.CLIENT, label: 'Client', description: 'Créer et suivre vos tickets', icon: <Users size={20} />, cls: 'bg-primary-600/10 border-primary-600/20 text-primary-600' },
  { value: UserRole.AGENT, label: 'Agent Support', description: 'Gérer et résoudre les tickets', icon: <Headphones size={20} />, cls: 'bg-success/10 border-success/20 text-success' },
  { value: UserRole.MANAGER, label: 'Manager', description: 'Superviser les équipes et KPIs', icon: <BarChart3 size={20} />, cls: 'bg-info/10 border-info/20 text-info' },
  { value: UserRole.ADMIN, label: 'Administrateur', description: 'Gestion complète du système', icon: <Shield size={20} />, cls: 'bg-primary-400/10 border-primary-400/20 text-primary-400' },
];

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25 },
};

export default function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading: loading, error } = useSelector((state: RootState) => state.auth);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', firstName: '', lastName: '',
    phone: '', companyName: '', role: UserRole.CLIENT,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (error) dispatch(clearError());
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) setValidationErrors((prev) => ({ ...prev, [name]: '' }));
    if (error) dispatch(clearError());
  };

  const handleRoleSelect = (role: UserRole) => {
    setFormData((prev) => ({ ...prev, role }));
    setStep(2);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.firstName?.trim()) errors.firstName = 'Le prénom est requis';
    if (!formData.lastName?.trim()) errors.lastName = 'Le nom est requis';
    if (!formData.email?.trim()) errors.email = "L'adresse email est requise";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Adresse email invalide';
    if (!formData.password) errors.password = 'Le mot de passe est requis';
    else if (formData.password.length < 8) errors.password = 'Au moins 8 caractères requis';
    else if (!/[A-Z]/.test(formData.password)) errors.password = 'Doit contenir au moins une majuscule';
    else if (!/[0-9]/.test(formData.password)) errors.password = 'Doit contenir au moins un chiffre';
    if (!formData.confirmPassword) errors.confirmPassword = 'Veuillez confirmer le mot de passe';
    else if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    if (!acceptTerms) errors.terms = "Veuillez accepter les conditions d'utilisation";
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    try {
      await dispatch(register({
        email: formData.email, password: formData.password, confirmPassword: formData.confirmPassword,
        firstName: formData.firstName, lastName: formData.lastName, phone: formData.phone || undefined, companyName: formData.companyName || undefined,
        role: formData.role,
      })).unwrap();
      // Rediriger vers la page de vérification d'email
      navigate(`/verify-email?email=${encodeURIComponent(formData.email)}`);
    } catch (_) {}
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (credentialResponse.credential) {
        await dispatch(googleLogin(credentialResponse.credential)).unwrap();
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Google login error:', err);
    }
  };

  const selectedRole = roleOptions.find((r) => r.value === formData.role);
  const steps = [{ key: 1, label: 'Profil' }, { key: 2, label: 'Informations' }];

  /** Render a dark auth-style input field */
  const renderField = (
    name: string, label: string, type = 'text', placeholder = '',
    icon?: React.ReactNode, rightElement?: React.ReactNode
  ) => (
    <div className="group">
      <label className="block text-sm font-medium text-ds-secondary mb-1.5">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-muted group-focus-within:text-primary-400 transition-colors">
            {icon}
          </span>
        )}
        <input
          name={name}
          type={type}
          value={(formData as any)[name]}
          onChange={handleChange}
          placeholder={placeholder}
          className="auth-input"
          style={{
            paddingLeft: icon ? '2.75rem' : '1rem',
            paddingRight: rightElement ? '3rem' : '1rem',
          }}
        />
        {rightElement && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
            {rightElement}
          </span>
        )}
      </div>
      {validationErrors[name] && (
        <p className="text-xs text-red-400 mt-1">{validationErrors[name]}</p>
      )}
    </div>
  );

  return (
    <AuthLayout>
      {/* Glassmorphism card */}
      <motion.div
        className="auth-glass p-7 sm:p-9"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        {/* Mobile stepper */}
        <div className="lg:hidden flex justify-center gap-2 mb-6">
          {steps.map((s) => (
            <span
              key={s.key}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                step >= s.key
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-ds-elevated/50 text-ds-muted border border-ds-border/50'
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>

        {/* Desktop stepper */}
        <div className="hidden lg:flex items-center gap-2 mb-7">
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`flex items-center gap-1.5 ${step >= s.key ? 'text-primary-400' : 'text-ds-muted'}`}>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                    step >= s.key
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                      : 'bg-ds-elevated/50 text-ds-muted border border-ds-border/50'
                  }`}
                >
                  {step > s.key ? <CheckCircle size={14} /> : s.key}
                </span>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px mx-1 transition-colors ${
                    step >= 2 ? 'bg-primary-500/30' : 'bg-ds-border/50'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ===== STEP 1: Role selection ===== */}
          {step === 1 ? (
            <motion.div key="step1" {...pageTransition} className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-ds-primary">Choisissez votre profil</h2>
                <p className="text-sm text-ds-muted mt-1.5">Type de compte correspondant à votre rôle</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roleOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => handleRoleSelect(option.value)}
                    className="p-4 rounded-xl text-left transition-all duration-200 group
                               bg-ds-elevated/40 border border-ds-border/50
                               hover:border-primary/20 hover:shadow-soft-lg"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg border ${option.cls}`}
                      >
                        {option.icon}
                      </div>
                      <div>
                        <div className="font-semibold text-ds-secondary text-sm group-hover:text-ds-primary transition-colors">
                          {option.label}
                        </div>
                        <div className="text-xs text-ds-muted mt-0.5">
                          {option.description}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <p className="text-center text-sm text-ds-muted pt-2">
                Déjà un compte ?{' '}
                <Link to="/login" className="auth-link font-semibold">Se connecter</Link>
              </p>
            </motion.div>

          ) : (
            /* ===== STEP 2: Registration form ===== */
            <motion.div key="step2" {...pageTransition}>
              {/* Back button + selected role */}
              <div className="flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-ds-muted hover:text-primary-400 transition-colors"
                >
                  <ChevronLeft size={18} />
                  Retour
                </button>
                {selectedRole && (
                  <span
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border ${selectedRole.cls}`}
                  >
                    {selectedRole.label}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-ds-primary">Créer votre compte</h2>
              <p className="text-sm text-ds-muted mt-1 mb-5">Renseignez vos informations</p>

              {/* Error */}
              {error && (
                <div
                  className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400"
                >
                  <AlertCircle size={18} className="flex-shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name row */}
                <div className="grid grid-cols-2 gap-3">
                  {renderField('firstName', 'Prénom *', 'text', 'Jean')}
                  {renderField('lastName', 'Nom *', 'text', 'Dupont')}
                </div>

                {renderField('email', 'Adresse email *', 'email', 'vous@entreprise.com', <Mail size={18} />)}
                {renderField('phone', 'Téléphone', 'tel', '+216 XX XXX XXX', <Phone size={18} />)}

                {formData.role === UserRole.CLIENT && (
                  renderField('companyName', 'Entreprise', 'text', "Nom de l'entreprise", <Building2 size={18} />)
                )}

                {/* Password */}
                {renderField(
                  'password', 'Mot de passe *',
                  showPassword ? 'text' : 'password', '••••••••',
                  <Lock size={18} />,
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-ds-muted hover:text-ds-secondary transition-colors">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}
                {!validationErrors.password && (
                  <p className="text-xs text-ds-muted -mt-3">
                    Minimum 8 caractères, 1 majuscule et 1 chiffre
                  </p>
                )}

                {/* Confirm password */}
                {renderField(
                  'confirmPassword', 'Confirmer le mot de passe *',
                  showConfirmPassword ? 'text' : 'password', '••••••••',
                  <Lock size={18} />,
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-ds-muted hover:text-ds-secondary transition-colors">
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                )}

                {/* Terms */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptTerms}
                    onChange={(e) => {
                      setAcceptTerms(e.target.checked);
                      if (validationErrors.terms) setValidationErrors((p) => ({ ...p, terms: '' }));
                    }}
                    className="mt-1 h-4 w-4 rounded border-ds-border bg-ds-elevated text-primary-500 focus:ring-primary-500/30 cursor-pointer"
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-ds-muted cursor-pointer">
                    J'accepte les{' '}
                    <a href="#" className="auth-link">conditions d'utilisation</a> et la{' '}
                    <a href="#" className="auth-link">politique de confidentialité</a>.
                  </label>
                </div>
                {validationErrors.terms && <p className="text-xs text-red-400">{validationErrors.terms}</p>}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="auth-btn-primary"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      Création...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Créer mon compte
                    </>
                  )}
                </button>
              </form>

              {/* Google OAuth - Only show if properly configured */}
              {isGoogleOAuthEnabled && (
                <>
                  {/* Separator + Google */}
                  <div className="my-5">
                    <div className="auth-separator">Ou continuer avec</div>
                  </div>
                  <div className="flex justify-center">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => {}}
                      text="signup_with"
                      shape="rectangular"
                      theme="outline"
                      size="large"
                    />
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AuthLayout>
  );
}
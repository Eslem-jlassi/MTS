import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { AnimatePresence, motion } from "framer-motion";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  ChevronLeft,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Phone,
  Users,
} from "lucide-react";
import { RootState, AppDispatch } from "../redux/store";
import { clearError, googleLogin, register } from "../redux/slices/authSlice";
import AuthLayout from "../components/auth/AuthLayout";
import { isGoogleOAuthEnabled } from "../App";
import { AuthResponse, UserRole } from "../types";
import {
  getPasswordConfirmationError,
  getPasswordValidationError,
} from "../utils/passwordValidation";

interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: React.ReactNode;
  cls: string;
}

const roleOptions: RoleOption[] = [
  {
    value: UserRole.CLIENT,
    label: "Client",
    description: "Creer et suivre vos tickets de support",
    icon: <Users size={20} />,
    cls: "bg-primary-600/10 border-primary-600/20 text-primary-600",
  },
];

const pageTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25 },
};

function shouldWaitForEmailVerification(response: AuthResponse): boolean {
  return Boolean(response.emailVerificationRequired || response.user.emailVerified === false);
}

export default function RegisterPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { isLoading: loading, error } = useSelector((state: RootState) => state.auth);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    companyName: "",
    role: UserRole.CLIENT,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (error) {
      dispatch(clearError());
    }
  };

  const handleRoleSelect = (role: UserRole) => {
    setFormData((prev) => ({ ...prev, role }));
    setStep(2);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) errors.firstName = "Le prenom est requis";
    if (!formData.lastName.trim()) errors.lastName = "Le nom est requis";
    if (!formData.email.trim()) errors.email = "L'adresse email est requise";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Adresse email invalide";
    }

    const passwordError = getPasswordValidationError(formData.password);
    if (passwordError) errors.password = passwordError;

    const confirmationError = getPasswordConfirmationError(
      formData.password,
      formData.confirmPassword,
    );
    if (confirmationError) errors.confirmPassword = confirmationError;

    if (!acceptTerms) {
      errors.terms = "Veuillez accepter les conditions d'utilisation";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const response = await dispatch(
        register({
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          companyName: formData.companyName || undefined,
          role: formData.role,
        }),
      ).unwrap();

      if (shouldWaitForEmailVerification(response)) {
        navigate(`/verify-email?email=${encodeURIComponent(response.user.email)}&status=pending`);
        return;
      }

      navigate("/dashboard");
    } catch {
      // handled by slice state
    }
  };

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    try {
      if (credentialResponse.credential) {
        await dispatch(googleLogin(credentialResponse.credential)).unwrap();
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Google login error:", err);
    }
  };

  const selectedRole = roleOptions.find((r) => r.value === formData.role);
  const steps = [
    { key: 1, label: "Profil" },
    { key: 2, label: "Informations" },
  ];

  const renderField = (
    name: string,
    label: string,
    type = "text",
    placeholder = "",
    icon?: React.ReactNode,
    rightElement?: React.ReactNode,
  ) => (
    <div className="group">
      <label className="mb-1.5 block text-sm font-medium text-ds-secondary">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-muted transition-colors group-focus-within:text-primary-400">
            {icon}
          </span>
        )}
        <input
          name={name}
          type={type}
          value={(formData as Record<string, string>)[name] ?? ""}
          onChange={handleChange}
          placeholder={placeholder}
          className="auth-input"
          style={{
            paddingLeft: icon ? "2.75rem" : "1rem",
            paddingRight: rightElement ? "3rem" : "1rem",
          }}
        />
        {rightElement && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{rightElement}</span>
        )}
      </div>
      {validationErrors[name] && (
        <p className="mt-1 text-xs text-red-400">{validationErrors[name]}</p>
      )}
    </div>
  );

  return (
    <AuthLayout>
      <motion.div
        className="auth-glass p-7 sm:p-9"
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="mb-6 flex justify-center gap-2 lg:hidden">
          {steps.map((s) => (
            <span
              key={s.key}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                step >= s.key
                  ? "border border-primary-500/30 bg-primary-500/20 text-primary-400"
                  : "border border-ds-border/50 bg-ds-elevated/50 text-ds-muted"
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>

        <div className="mb-7 hidden items-center gap-2 lg:flex">
          {steps.map((s, i) => (
            <React.Fragment key={s.key}>
              <div className={`flex items-center gap-1.5 ${step >= s.key ? "text-primary-400" : "text-ds-muted"}`}>
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                    step >= s.key
                      ? "border border-primary-500/30 bg-primary-500/20 text-primary-400"
                      : "border border-ds-border/50 bg-ds-elevated/50 text-ds-muted"
                  }`}
                >
                  {step > s.key ? <CheckCircle size={14} /> : s.key}
                </span>
                <span className="text-sm font-medium">{s.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`mx-1 h-px flex-1 transition-colors ${
                    step >= 2 ? "bg-primary-500/30" : "bg-ds-border/50"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div key="step1" {...pageTransition} className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-ds-primary">Choisissez votre profil</h2>
                <p className="mt-1.5 text-sm text-ds-muted">
                  Inscription publique reservee aux comptes clients
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {roleOptions.map((option) => (
                  <motion.button
                    key={option.value}
                    type="button"
                    onClick={() => handleRoleSelect(option.value)}
                    className="group rounded-xl border border-ds-border/50 bg-ds-elevated/40 p-4 text-left transition-all duration-200 hover:border-primary/20 hover:shadow-soft-lg"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border ${option.cls}`}
                      >
                        {option.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-ds-secondary transition-colors group-hover:text-ds-primary">
                          {option.label}
                        </div>
                        <div className="mt-0.5 text-xs text-ds-muted">{option.description}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="rounded-xl border border-ds-border/60 bg-ds-elevated/40 px-4 py-3">
                <p className="text-sm text-ds-muted">
                  Les comptes internes agent, manager et administrateur sont crees par un
                  administrateur depuis le back-office.
                </p>
              </div>

              <p className="pt-2 text-center text-sm text-ds-muted">
                Deja un compte ?{" "}
                <Link to="/login" className="auth-link font-semibold">
                  Se connecter
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div key="step2" {...pageTransition}>
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1 text-sm text-ds-muted transition-colors hover:text-primary-400"
                >
                  <ChevronLeft size={18} />
                  Retour
                </button>
                {selectedRole && (
                  <span
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${selectedRole.cls}`}
                  >
                    {selectedRole.label}
                  </span>
                )}
              </div>

              <h2 className="text-xl font-bold text-ds-primary">Creer votre compte</h2>
              <p className="mb-5 mt-1 text-sm text-ds-muted">
                Renseignez vos informations pour activer votre espace client.
              </p>

              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-500 dark:text-red-400">
                  <AlertCircle size={18} className="flex-shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {renderField("firstName", "Prenom *", "text", "Jean")}
                  {renderField("lastName", "Nom *", "text", "Dupont")}
                </div>

                {renderField("email", "Adresse email *", "email", "vous@entreprise.com", <Mail size={18} />)}
                {renderField("phone", "Telephone", "tel", "+216 XX XXX XXX", <Phone size={18} />)}

                {formData.role === UserRole.CLIENT &&
                  renderField(
                    "companyName",
                    "Entreprise",
                    "text",
                    "Nom de l'entreprise",
                    <Building2 size={18} />,
                  )}

                {renderField(
                  "password",
                  "Mot de passe *",
                  showPassword ? "text" : "password",
                  "********",
                  <Lock size={18} />,
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-ds-muted transition-colors hover:text-ds-secondary"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>,
                )}
                {!validationErrors.password && (
                  <p className="-mt-3 text-xs text-ds-muted">
                    Minimum 8 caracteres, avec une majuscule, une minuscule et un chiffre
                  </p>
                )}

                {renderField(
                  "confirmPassword",
                  "Confirmer le mot de passe *",
                  showConfirmPassword ? "text" : "password",
                  "********",
                  <Lock size={18} />,
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="text-ds-muted transition-colors hover:text-ds-secondary"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>,
                )}

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptTerms}
                    onChange={(e) => {
                      setAcceptTerms(e.target.checked);
                      if (validationErrors.terms) {
                        setValidationErrors((prev) => ({ ...prev, terms: "" }));
                      }
                    }}
                    className="mt-1 h-4 w-4 cursor-pointer rounded border-ds-border bg-ds-elevated text-primary-500 focus:ring-primary-500/30"
                  />
                  <label htmlFor="acceptTerms" className="cursor-pointer text-sm text-ds-muted">
                    J'accepte les <span className="auth-link">conditions d'utilisation</span> et la{" "}
                    <span className="auth-link">politique de confidentialite</span>.
                  </label>
                </div>
                {validationErrors.terms && (
                  <p className="text-xs text-red-400">{validationErrors.terms}</p>
                )}

                <button type="submit" disabled={loading} className="auth-btn-primary">
                  {loading ? (
                    <>
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creation...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Creer mon compte
                    </>
                  )}
                </button>
              </form>

              {isGoogleOAuthEnabled && (
                <>
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

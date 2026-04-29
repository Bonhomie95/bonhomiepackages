import { useState, useCallback, useEffect, useRef } from 'react';
import { saveState, loadState, clearState } from '../utils/storage.js';

/**
 * Multi-step form state machine with optional localStorage persistence.
 *
 * @param {{\
 *   steps: Array<{ validate?: (data: object) => true | object }>;\
 *   initialData?: object;\
 *   storageKey?: string | null;\
 *   onComplete?: (data: object) => void;\
 * }} options
 *
 * NOTE — steps stability: wrap your steps array in useMemo (or define it
 * outside the component) to avoid recreating validator closures on every render.
 *
 *   const steps = useMemo(() => [{ validate: (d) => d.name ? true : { name: 'Required' } }], []);
 *   const form = useMultiStepForm({ steps, ... });
 */
export default function useMultiStepForm({
  steps = [],
  initialData = {},
  storageKey = null,
  onComplete = () => {},
}) {
  const restored = storageKey ? loadState(storageKey) : null;

  const [data, setDataState] = useState(restored?.data || initialData);
  const [currentStep, setCurrentStep] = useState(restored?.currentStep || 0);
  const [errors, setErrors] = useState({});

  // Keep stable refs to steps and onComplete so callbacks don't need them as deps
  const stepsRef = useRef(steps);
  useEffect(() => { stepsRef.current = steps; });

  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; });

  // Persist on every meaningful change
  useEffect(() => {
    if (storageKey) saveState(storageKey, { data, currentStep });
  }, [data, currentStep, storageKey]);

  const totalSteps = steps.length;
  const isLast = currentStep === totalSteps - 1;

  const validateStep = useCallback(
    (stepIndex = currentStep) => {
      const validator = stepsRef.current[stepIndex]?.validate;
      if (!validator) return true;

      const result = validator(data);
      if (result === true) {
        setErrors({});
        return true;
      }

      setErrors(result);
      return false;
    },
    [currentStep, data]
  );

  const next = useCallback(() => {
    if (!validateStep()) return false;

    if (isLast) {
      if (storageKey) clearState(storageKey);
      onCompleteRef.current(data);
      return true;
    }

    setCurrentStep((s) => s + 1);
    return true;
  }, [validateStep, isLast, data, storageKey]);

  const back = useCallback(() => {
    setErrors({});
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  }, [currentStep]);

  /** Update a single field by name */
  const update = useCallback(
    (name, value) => setDataState((d) => ({ ...d, [name]: value })),
    []
  );

  /**
   * Bulk-update multiple fields at once.
   * Accepts either a partial object or an updater function (prev => next).
   */
  const setData = useCallback((patch) => {
    setDataState((d) => ({
      ...d,
      ...(typeof patch === 'function' ? patch(d) : patch),
    }));
  }, []);

  const reset = useCallback(() => {
    setDataState(initialData);
    setCurrentStep(0);
    setErrors({});
    if (storageKey) clearState(storageKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  return {
    data,
    update,
    setData,      // NEW: bulk update
    next,
    back,
    reset,
    errors,
    validateStep, // NEW: exposed for manual validation triggers
    currentStep,
    totalSteps,
    isLast,
    step: steps[currentStep],
  };
}

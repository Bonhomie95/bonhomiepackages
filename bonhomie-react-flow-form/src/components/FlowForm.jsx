import React from 'react';

/**
 * FlowForm — render-prop wrapper for multi-step forms.
 *
 * The children prop is called as a function with (step, currentStep, totalSteps):
 *
 *   <FlowForm step={form.step} currentStep={form.currentStep} totalSteps={form.totalSteps}>
 *     {(step, current, total) => (
 *       <div>
 *         <h2>{step.title}</h2>
 *         ...your fields...
 *       </div>
 *     )}
 *   </FlowForm>
 *
 * transition: 'fade' | 'slide' — applies a CSS class you can target in your
 * own stylesheet. No transition styles are bundled; this keeps the component
 * style-agnostic. Example:
 *
 *   .flow-fade { transition: opacity 0.25s ease; }
 *   .flow-slide { transition: transform 0.3s ease; }
 *
 * @param {{
 *   step: object;
 *   currentStep: number;
 *   totalSteps: number;
 *   children: (step: object, currentStep: number, totalSteps: number) => React.ReactNode;
 *   transition?: 'fade' | 'slide' | string;
 * }} props
 */
export default function FlowForm({
  step,
  currentStep,
  totalSteps,
  children,
  transition = 'fade',
}) {
  if (typeof children !== 'function') {
    throw new Error(
      '[FlowForm] children must be a render function: (step, currentStep, totalSteps) => ReactNode'
    );
  }

  return (
    <div className={`flow-form flow-${transition}`}>
      <div className="flow-step">{children(step, currentStep, totalSteps)}</div>
    </div>
  );
}

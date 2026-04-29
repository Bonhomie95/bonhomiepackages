# <div align="center">@bonhomie/react-flow-form</div>

<p align="center">
  <img src="https://img.shields.io/npm/v/@bonhomie/react-flow-form?color=%2300b8ff&label=npm%20version" />
  <img src="https://img.shields.io/npm/dm/@bonhomie/react-flow-form?color=%23ff9900&label=downloads" />
  <img src="https://img.shields.io/bundlephobia/minzip/@bonhomie/react-flow-form?color=%23c084fc&label=size" />
  <img src="https://img.shields.io/github/license/bonhomie/react-flow-form?color=%2390EE90&label=license" />
</p>

<p align="center">
  ⚡ A modern, flexible multi-step form engine for React.<br />
  Includes validation per step, transitions, progress bar, state persistence, localStorage restore,<br />
  and clean APIs for onboarding, KYC, checkout, signup flows, and more.
</p>

---

## 🎯 Why use React Flow Form?

Building multi-step forms is **one of the most repeated tasks** in modern apps: KYC onboarding, user registration, checkout flows, pricing wizards, surveys, and job applications. Developers hate rewriting navigation logic, validation, transitions, persistence, and step management. This library makes it **plug-and-play**.

---

## 🚀 Features

- Next / Previous step navigation with step metadata
- Per-step validation with error map returned
- `setData()` for bulk data updates (new in v2.1)
- Exposed `validateStep()` for manual validation triggers (new in v2.1)
- Auto-save form state to `localStorage` with auto-restore on reload
- Fade / slide transition class hooks (style-agnostic)
- `<FlowForm>`, `<Step>`, and `<ProgressBar>` components included
- Full SSR safety — `localStorage` access is guarded server-side

---

## 📦 Installation

```bash
npm install @bonhomie/react-flow-form
# or
yarn add @bonhomie/react-flow-form
```

---

## 🧪 Quick Start

```jsx
import {
  FlowForm,
  Step,
  ProgressBar,
  useMultiStepForm
} from "@bonhomie/react-flow-form";

export default function SignupFlow() {
  const {
    data,
    update,
    next,
    back,
    errors,
    currentStep,
    totalSteps,
    step
  } = useMultiStepForm({
    storageKey: "signup-flow",
    initialData: { email: "", name: "" },
    steps: [
      {
        id: "email",
        validate: (data) =>
          data.email.includes("@") ? true : { email: "Invalid email" },
      },
      {
        id: "profile",
        validate: () => true,
      }
    ],
    onComplete: (data) => {
      console.log("FINISHED:", data);
    }
  });

  return (
    <FlowForm step={step} currentStep={currentStep} totalSteps={totalSteps}>
      {(step) => (
        <>
          <ProgressBar current={currentStep} total={totalSteps} />

          {step.id === "email" && (
            <Step>
              <h2>Enter Email</h2>
              <input
                value={data.email}
                onChange={(e) => update("email", e.target.value)}
              />
              {errors.email && <p style={{ color: "red" }}>{errors.email}</p>}
              <button onClick={next}>Next</button>
            </Step>
          )}

          {step.id === "profile" && (
            <Step>
              <h2>Your Name</h2>
              <input
                value={data.name}
                onChange={(e) => update("name", e.target.value)}
              />
              <div style={{ marginTop: 16 }}>
                <button onClick={back}>Back</button>
                <button onClick={next}>Finish</button>
              </div>
            </Step>
          )}
        </>
      )}
    </FlowForm>
  );
}
```

---

## ⚙️ API Reference

### `useMultiStepForm(options)`

**Options**

| Option        | Type           | Description                                      |
| ------------- | -------------- | ------------------------------------------------ |
| `steps`       | `array`        | Required. Each step: `{ id, validate }`.         |
| `initialData` | `object`       | Default form state.                              |
| `storageKey`  | `string\|null` | Enable localStorage persistence + restore.       |
| `onComplete`  | `function`     | Fired when last step passes validation.          |

> **Tip:** Define `steps` outside the component or wrap with `useMemo` to avoid recreating validators on every render.

**Returned Values**

| Value                   | Description                              |
| ----------------------- | ---------------------------------------- |
| `data`                  | All form state.                          |
| `update(name, value)`   | Update a single field.                   |
| `setData(patch)`        | Bulk update fields (object or updater fn). |
| `next()`                | Validate + advance. Returns `boolean`.   |
| `back()`                | Go to previous step, clears errors.      |
| `reset()`               | Reset to initial state, clears storage.  |
| `errors`                | Validation error map from current step.  |
| `validateStep(index?)`  | Manually trigger step validation.        |
| `currentStep`           | Current step index (0-based).            |
| `totalSteps`            | Total number of steps.                   |
| `isLast`                | `true` when on the last step.            |
| `step`                  | Current step object.                     |

---

## 🧱 Components

### `<FlowForm>`

Render-prop wrapper. `children` must be a function `(step, currentStep, totalSteps) => ReactNode`.

| Prop          | Type     | Description                            |
| ------------- | -------- | -------------------------------------- |
| `step`        | `object` | Step object returned by hook           |
| `currentStep` | `number` | Current step index                     |
| `totalSteps`  | `number` | Number of steps                        |
| `transition`  | `string` | `"fade"` (default) or `"slide"`. Adds a CSS class — add your own transition styles. |

### `<Step>`

Lightweight wrapper for step content.

```jsx
<Step>
  <h1>Step 1</h1>
</Step>
```

### `<ProgressBar>`

```jsx
<ProgressBar current={0} total={4} />
```

| Prop      | Type     | Description         |
| --------- | -------- | ------------------- |
| `current` | `number` | Current step index  |
| `total`   | `number` | Total steps         |

---

## ⚠️ SSR Notes (Next.js / Remix)

`localStorage` access is fully guarded server-side as of v2.1. You can safely import the hook in SSR environments — persistence simply won't activate until the browser takes over.

---

## 🩹 Troubleshooting

**"Validation not running"** — ensure your step contains `validate: (data) => true | { field: "error" }`.

**"Form not saving to storage"** — set `storageKey: "my-form"`.

**"Going next does nothing"** — your validator returned an error object, not `true`.

---

## 🗺 Roadmap

- Animation presets (slide, zoom, curtain)
- TypeScript rewrite
- Zod/Yup schema integration (optional addon)
- Visual form designer (Pro version)

---

## 📄 License

MIT — Free for commercial and personal use.

## 👨‍💻 Author

**Bonhomie** · Full-stack Web & Mobile Developer · Creator of @bonhomie toolkits.

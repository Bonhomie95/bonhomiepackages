# @bonhomie/useful-hooks

A clean, production-ready collection of **React hooks** for everyday development.
Minimal, fast, dependency-free, and fully SSR-safe.

![npm](https://img.shields.io/npm/v/@bonhomie/useful-hooks)
![downloads](https://img.shields.io/npm/dm/@bonhomie/useful-hooks)
![license](https://img.shields.io/npm/l/@bonhomie/useful-hooks)
![react](https://img.shields.io/badge/react-17%2B-blue?logo=react)

---

## 📦 Installation

```bash
npm install @bonhomie/useful-hooks
# or
yarn add @bonhomie/useful-hooks
```

---

## 🪝 Hooks

### `useLocalStorage`

Persist state in `localStorage` with cross-tab sync. Fully SSR-safe.

```jsx
import { useLocalStorage } from "@bonhomie/useful-hooks";

function App() {
  const [name, setName] = useLocalStorage("name", "Bonhomie");

  return (
    <input value={name} onChange={e => setName(e.target.value)} />
  );
}
```

---

### `useDarkMode`

Toggle and persist dark mode with system preference sync.

```jsx
import { useDarkMode } from "@bonhomie/useful-hooks";

function ThemeToggle() {
  const { dark, setDark } = useDarkMode();

  return (
    <button onClick={() => setDark(!dark)}>
      {dark ? "Switch to Light" : "Switch to Dark"}
    </button>
  );
}
```

Adds/removes a `dark` class on `document.documentElement` — compatible with Tailwind CSS dark mode.

---

### `useDebounce`

Delay a value update until the user stops typing.

```jsx
import { useDebounce } from "@bonhomie/useful-hooks";

function SearchBox() {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 400);

  useEffect(() => {
    if (!debounced) return;
    // Call API here
  }, [debounced]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

---

### `useThrottle`

Limit how often a value updates during rapid changes (e.g. scroll, resize).

```jsx
import { useThrottle } from "@bonhomie/useful-hooks";

function ScrollTracker() {
  const [pos, setPos] = useState(0);
  const throttledPos = useThrottle(pos, 200);

  useEffect(() => {
    const handler = () => setPos(window.scrollY);
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return <div>Scroll Y: {throttledPos}</div>;
}
```

---

### `useToggle`

Boolean toggle with explicit setters.

```jsx
import { useToggle } from "@bonhomie/useful-hooks";

function Example() {
  const { value, toggle, setTrue, setFalse } = useToggle();

  return (
    <div>
      <p>{value ? "ON" : "OFF"}</p>
      <button onClick={toggle}>Toggle</button>
      <button onClick={setTrue}>Set ON</button>
      <button onClick={setFalse}>Set OFF</button>
    </div>
  );
}
```

---

### `useClickOutside`

Fire a callback when the user clicks outside a ref'd element.

```jsx
import { useRef } from "react";
import { useClickOutside, useToggle } from "@bonhomie/useful-hooks";

function Dropdown() {
  const ref = useRef(null);
  const { value, toggle, setFalse } = useToggle();

  useClickOutside(ref, () => setFalse());

  return (
    <div>
      <button onClick={toggle}>Menu</button>
      {value && (
        <div ref={ref} className="dropdown">
          <p>Item 1</p>
          <p>Item 2</p>
        </div>
      )}
    </div>
  );
}
```

---

### `useWindowSize`

Reactive window width and height.

```jsx
import { useWindowSize } from "@bonhomie/useful-hooks";

function Component() {
  const { width, height } = useWindowSize();
  return <p>Screen: {width} × {height}</p>;
}
```

---

### `useCopyToClipboard`

Copy text to clipboard with a timed "Copied!" feedback state.

> Requires HTTPS or `localhost` — `navigator.clipboard` is unavailable on plain HTTP.

```jsx
import { useCopyToClipboard } from "@bonhomie/useful-hooks";

function Referral() {
  const { copied, copy } = useCopyToClipboard();

  return (
    <button onClick={() => copy("BONHOMIE-123")}>
      {copied ? "Copied!" : "Copy Code"}
    </button>
  );
}
```

---

### `useAsync`

Run any async function with loading / error / value state.

```jsx
import { useAsync } from "@bonhomie/useful-hooks";

function ProfileLoader() {
  const fetchUser = () => fetch("/api/user").then(res => res.json());
  const { execute, loading, error, value } = useAsync(fetchUser, []);

  useEffect(() => { execute(); }, [execute]);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error loading profile</p>;
  return <pre>{JSON.stringify(value, null, 2)}</pre>;
}
```

---

### `useFetch`

Declarative data fetching with abort on unmount and a `refetch` function.

```jsx
import { useFetch } from "@bonhomie/useful-hooks";

function Users() {
  const { data, loading, error, refetch } = useFetch("/api/users");

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error fetching users</p>;

  return (
    <div>
      <button onClick={refetch}>Refresh</button>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
```

POST example:

```jsx
useFetch("/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
```

> If your `options` object is created inline (new object on every render), memoize it with `useMemo` — otherwise a refetch fires on every render.

---

## 📄 License

MIT — Free for personal and commercial use.

## 👨‍💻 Author

**Bonhomie** · Full-stack Web & Mobile Developer · Creator of @bonhomie toolkits.

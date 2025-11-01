# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

### React + Vite + Tailwind Setup

0 **cd into directory**

```bash
cd src/tailor-ui
```

1️⃣ **Create project (in current folder)**

```bash
npm create vite@latest . -- --template react
```

_(Add `-ts` after `react` if you want TypeScript)_

2️⃣ **Install dependencies**

```bash
npm install
```

```bash
npm i react react-dom react-router-dom
```

3️⃣ **Add Tailwind**

```bash
npm i -D vite @tailwindcss/vite tailwindcss
```

4️⃣ **Edit `vite.config.js`**

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
```

5️⃣ **Edit `src/index.css`**

```css
@import "tailwindcss";
```

6️⃣ **Start dev server**

```bash
npm run dev
```

---

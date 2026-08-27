import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

/**
 * ESLint flat config（Next.js 16 / eslint 9）。
 * eslint-config-next@16 原生导出 flat config 数组，直接展开即可，
 * 不再使用 @eslint/eslintrc 的 FlatCompat（会与已是 flat 的配置产生循环引用）。
 */
const eslintConfig = [
  ...nextCoreWebVitals,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "build/**",
      "supabase/**",
      "next-env.d.ts",
    ],
  },
  {
    // Today intentionally reconciles the selected rank when a newly loaded
    // signal set contains fewer items than the previous/default selection.
    // Keep this existing runtime behavior intact during the public-release
    // documentation pass; a future interaction refactor can remove the effect.
    files: ["src/components/frontier/today-r27-production.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];

export default eslintConfig;
